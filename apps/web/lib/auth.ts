import api from './api'

export interface User {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  roles: string[]
  permissions: string[]
  appAccess: string[]
}

export type AppArea = 'HQ' | 'INSPECTOR' | 'CITIZEN' | 'SUPPORT' | 'DISTRICT' | 'ADMIN' | 'COMMANDER' | 'ACCOMMODATION' | 'OPERATOR_137'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Which users may enter which app area
const ACCESS_RULES: Record<AppArea, (u: User) => boolean> = {
  ADMIN:         u => u.roles.includes('SUPER_ADMIN'),
  HQ:            u => u.roles.includes('SUPER_ADMIN') || u.appAccess.includes('HQ'),
  INSPECTOR:     u => u.roles.includes('SUPER_ADMIN') || u.appAccess.includes('INSPECTOR'),
  CITIZEN:       u => u.roles.includes('SUPER_ADMIN') || u.appAccess.includes('CITIZEN'),
  SUPPORT:       u => u.roles.includes('SUPER_ADMIN') || u.appAccess.includes('SUPPORT'),
  DISTRICT:      u => u.roles.includes('SUPER_ADMIN') || u.appAccess.includes('DISTRICT'),
  COMMANDER:     u => u.roles.includes('SUPER_ADMIN') || u.appAccess.includes('COMMANDER'),
  ACCOMMODATION: u => u.roles.includes('SUPER_ADMIN') || u.appAccess.includes('ACCOMMODATION'),
  OPERATOR_137:  u => u.roles.includes('SUPER_ADMIN') || u.appAccess.includes('OPERATOR_137'),
}

export function canAccess(user: User, area: AppArea): boolean {
  return ACCESS_RULES[area]?.(user) ?? false
}

export async function register(email: string, password: string, fullName: string, phone?: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName, phone }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'خطا در ثبت‌نام')
  }
  const data = await res.json()
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'اطلاعات ورود نامعتبر است')
  }

  const data = await res.json()
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export async function fetchMe(): Promise<User> {
  return api.get('/auth/me')
}

export function getRedirectPath(user: User): string {
  const { appAccess, roles } = user
  if (roles.includes('SUPER_ADMIN'))           return '/admin'
  if (appAccess.includes('HQ'))                return '/hq'
  if (appAccess.includes('INSPECTOR'))         return '/inspector'
  if (appAccess.includes('SUPPORT'))           return '/support'
  if (appAccess.includes('COMMANDER'))         return '/commander'
  if (appAccess.includes('ACCOMMODATION'))     return '/accommodation'
  if (appAccess.includes('OPERATOR_137'))      return '/operator'
  if (appAccess.includes('DISTRICT'))          return '/district'
  if (appAccess.includes('CITIZEN'))           return '/citizen'
  return '/'
}
