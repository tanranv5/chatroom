import { NextResponse } from 'next/server'
import { createHash, createHmac } from 'crypto'

// 管理端默认密码
export const DEFAULT_ADMIN_PASSWORD = 'admin123'

// 无状态 HMAC 签名令牌配置（生产环境建议在数据库中配置）
const TOKEN_SECRET = 'chatroom-admin-token-secret-2024'
const TOKEN_TTL = 24 * 60 * 60 * 1000 // 24h

type TokenPayload = {
  exp: number
}

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString('base64url')
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString()
}

// 哈希密码
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// 签发无状态令牌
export function issueToken(ttlMs: number = TOKEN_TTL): string {
  const payload: TokenPayload = { exp: Date.now() + ttlMs }
  const payloadStr = JSON.stringify(payload)
  const encoded = base64UrlEncode(payloadStr)
  const signature = createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

// 验证令牌
export function verifyToken(token?: string | null): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [encoded, signature] = parts
  const expectedSig = createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url')
  if (signature !== expectedSig) return false
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as TokenPayload
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

// 从请求中提取 Bearer token
function extractToken(request: Request): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!header) return null
  const matched = header.match(/^Bearer\s+(.+)$/i)
  return matched ? matched[1].trim() : null
}

// 检查请求是否来自管理员（不返回错误，只返回布尔值）
export function isAdminRequest(request: Request): boolean {
  const token = extractToken(request)
  return token ? verifyToken(token) : false
}

// 管理接口统一鉴权
export function requireAdminAuth(request: Request) {
  const token = extractToken(request)
  if (!token || !verifyToken(token)) {
    return NextResponse.json(
      { error: '未授权或令牌已失效' },
      { status: 401 }
    )
  }
  return null
}
