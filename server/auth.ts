import { createHash, randomBytes } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { compare, hash } from 'bcryptjs'
import { SESSION_DAYS } from '../shared/constants'
import { db, nowISO } from './db'

export const SESSION_COOKIE = 'edgebook_session'

const sessionMs = SESSION_DAYS * 24 * 60 * 60 * 1000

function secureCookies(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true
  if (process.env.COOKIE_SECURE === 'false') return false
  return process.env.NODE_ENV === 'production'
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 11)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash)
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url')
  const createdAt = nowISO()
  const expiresAt = new Date(Date.now() + sessionMs).toISOString()
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(hashToken(token), userId, createdAt, expiresAt)
  return token
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies(),
    path: '/',
    maxAge: sessionMs,
  })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies(),
    path: '/',
  })
}

export function destroySession(token: string | undefined): void {
  if (!token) return
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
}

export interface SessionUser {
  id: string
  email: string
  name: string
  is_demo: number
  created_at: string
}

export function attachUser(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE]
  if (typeof token !== 'string' || token.length < 20) {
    next()
    return
  }
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.is_demo, u.created_at,
              s.token_hash, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), nowISO()) as SessionUser | undefined
  if (!row) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
  } else {
    res.locals.user = row
    res.locals.sessionToken = token
  }
  next()
}

export function requireAuth(_req: Request, res: Response, next: NextFunction): void {
  if (!res.locals.user) {
    res.status(401).json({ error: { message: 'Please sign in to continue.', code: 'unauthorized' } })
    return
  }
  next()
}

export function currentUser(res: Response): SessionUser {
  return res.locals.user as SessionUser
}

const attempts = new Map<string, number[]>()

export function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
  const key = `${req.ip ?? 'unknown'}`
  const now = Date.now()
  const windowStart = now - 10 * 60 * 1000
  const recent = (attempts.get(key) ?? []).filter((time) => time > windowStart)
  if (recent.length >= 30) {
    res.status(429).json({
      error: {
        message: 'Too many attempts. Take a short break and try again.',
        code: 'rate_limited',
      },
    })
    return
  }
  recent.push(now)
  attempts.set(key, recent)
  next()
}
