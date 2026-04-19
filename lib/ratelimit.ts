const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function checkLoginRateLimit(ip: string): {
  allowed: boolean
  remaining: number
} {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const record = loginAttempts.get(ip)

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: maxAttempts - record.count }
}

export function resetLoginAttempts(ip: string) {
  loginAttempts.delete(ip)
}
