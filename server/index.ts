import { createServer as createHttpServer } from 'node:http'
import { resolve } from 'node:path'
import cookieParser from 'cookie-parser'
import express, { type NextFunction, type Request, type Response } from 'express'
import { api } from './api'
import { attachUser } from './auth'
import { cleanupSessions, db } from './db'
import { cleanupDemoUsers } from './seed'
import { HttpError } from './validate'

const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 4300)
const host = process.env.HOST || '0.0.0.0'

const app = express()
const httpServer = createHttpServer(app)

app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  if (isProduction) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    )
  }
  next()
})

app.use(express.json({ limit: '256kb' }))
app.use(cookieParser())
app.use('/api', attachUser, api)

app.use('/api', (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { message: error.message, code: error.code } })
    return
  }
  console.error('[api]', error)
  res.status(500).json({
    error: { message: 'Something went wrong on our side. Please try again.' },
  })
})

async function start() {
  if (isProduction) {
    const dist = resolve(process.cwd(), 'dist')
    app.use(
      express.static(dist, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.includes(`${dist}/assets/`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          } else {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      }),
    )
    app.get(/.*/, (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(resolve(dist, 'index.html'))
    })
  } else {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  }

  cleanupSessions()
  cleanupDemoUsers()
  httpServer.listen(port, host, () => {
    console.log(`\n  Edgebook ${isProduction ? 'running' : 'dev server'} → http://localhost:${port}\n`)
  })
}

start().catch((error) => {
  console.error('Failed to start Edgebook:', error)
  process.exit(1)
})

function shutdown() {
  httpServer.close(() => {
    db.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
