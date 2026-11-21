import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db, verifyPasscode } from '../db/database';
import type { AuthUser, LanguageCode, UserRole } from '../../src/shared/types';

// Ephemeral cryptographically random fallback when SESSION_SECRET env var is unset
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

interface TokenPayload {
  sub: string;
  role: UserRole;
  workerId?: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  workerId?: string;
  patientProfileId?: string;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function signAuthToken(payload: Omit<TokenPayload, 'exp'>, ttlSeconds = 60 * 60 * 8): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyAuthToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as TokenPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

interface DbUserRow {
  id: string;
  full_name: string;
  username: string;
  password_hash: string;
  role: UserRole;
  preferred_language: LanguageCode;
  account_status: string;
  avatar_url: string | null;
}

interface DbWorkerRow {
  id: string;
  worker_code: string;
  asha_unique_id: string | null;
  assigned_area: string;
}

interface DbPatientRow {
  id: string;
  patient_unique_id: string;
  beneficiary_id: string | null;
  assigned_mode: AuthUser['assignedMode'];
}

function enrichUserProfile(userRow: Omit<DbUserRow, 'password_hash'>): AuthUser & { workerId?: string } {
  const workerRow = db
    .prepare('SELECT id, worker_code, asha_unique_id, assigned_area FROM workers WHERE user_id = ?')
    .get(userRow.id) as DbWorkerRow | undefined;

  const patientRow =
    userRow.role === 'PATIENT'
      ? (db
          .prepare('SELECT id, patient_unique_id, beneficiary_id, assigned_mode FROM patient_profiles WHERE user_id = ?')
          .get(userRow.id) as DbPatientRow | undefined)
      : undefined;

  return {
    id: userRow.id,
    fullName: userRow.full_name,
    username: userRow.username,
    role: userRow.role,
    preferredLanguage: userRow.preferred_language,
    workerId: workerRow?.id,
    workerCode: workerRow?.worker_code,
    ashaUniqueId: workerRow?.asha_unique_id ?? undefined,
    assignedArea: workerRow?.assigned_area,
    avatarUrl: userRow.avatar_url ?? undefined,
    patientProfileId: patientRow?.id,
    patientUniqueId: patientRow?.patient_unique_id,
    beneficiaryId: patientRow?.beneficiary_id ?? undefined,
    assignedMode: patientRow?.assigned_mode,
  };
}

export function lookupUserByUsername(username: string): (AuthUser & { passwordHash: string; workerId?: string }) | null {
  const userRow = db
    .prepare('SELECT id, full_name, username, password_hash, role, preferred_language, account_status, avatar_url FROM users WHERE username = ? AND account_status = ?')
    .get(username.trim().toLowerCase(), 'ACTIVE') as DbUserRow | undefined;
  if (!userRow) return null;

  const enriched = enrichUserProfile(userRow);
  return {
    ...enriched,
    passwordHash: userRow.password_hash,
  };
}

export function lookupUserById(userId: string): (AuthUser & { workerId?: string }) | null {
  const userRow = db
    .prepare('SELECT id, full_name, username, role, preferred_language, account_status, avatar_url FROM users WHERE id = ? AND account_status = ?')
    .get(userId, 'ACTIVE') as Omit<DbUserRow, 'password_hash'> | undefined;
  if (!userRow) return null;

  return enrichUserProfile(userRow);
}

export function authenticateCredentials(username: string, passcode: string) {
  const found = lookupUserByUsername(username);
  if (!found) return null;
  if (!verifyPasscode(passcode, found.passwordHash)) return null;
  const { passwordHash: _ignored, ...safeUser } = found;
  const token = signAuthToken({
    sub: safeUser.id,
    role: safeUser.role,
    workerId: safeUser.workerId,
  });
  return { user: safeUser, token };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }
  const user = lookupUserById(payload.sub);
  if (!user) {
    res.status(401).json({ error: 'Account inactive or not found' });
    return;
  }
  req.authUser = user;
  req.workerId = user.role === 'PATIENT' ? undefined : (user.workerId ?? 'WORKER001');
  req.patientProfileId = user.patientProfileId;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser || !allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Insufficient role permissions for this resource' });
      return;
    }
    next();
  };
}
