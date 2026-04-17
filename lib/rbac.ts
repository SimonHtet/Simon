export type UserRole = 'admin' | 'manager' | 'front_desk' | 'housekeeping'

export const PERMISSIONS = {
  CREATE_RESERVATION: ['admin', 'manager', 'front_desk'],
  CANCEL_RESERVATION: ['admin', 'manager'],
  CHECKIN:            ['admin', 'manager', 'front_desk'],
  CHECKOUT:           ['admin', 'manager', 'front_desk'],
  MOVE_ROOM:          ['admin', 'manager', 'front_desk'],
  EXTEND_STAY:        ['admin', 'manager', 'front_desk'],
  NO_SHOW:            ['admin', 'manager', 'front_desk'],
  ADD_CHARGE:         ['admin', 'manager', 'front_desk'],
  POST_PAYMENT:       ['admin', 'manager'],
  VIEW_FINANCIALS:    ['admin', 'manager'],
  VIEW_ALL_USERS:     ['admin'],
  MANAGE_USERS:       ['admin'],
} as const

export function hasPermission(
  role: string,
  permission: keyof typeof PERMISSIONS
): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

export function requirePermission(
  role: string,
  permission: keyof typeof PERMISSIONS
) {
  if (!hasPermission(role, permission)) {
    return {
      error: true,
      response: Response.json(
        { error: 'Forbidden — insufficient permissions' },
        { status: 403 }
      ),
    }
  }
  return { error: false, response: null }
}
