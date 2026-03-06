import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'

type Permission =
  | '*'
  | 'employees'
  | 'branches'
  | 'departments'
  | 'attendance'
  | 'attendance.own'
  | 'salary'
  | 'bonus'
  | 'kpi'
  | 'kpi.own'
  | 'leaves'
  | 'leaves.own'
  | 'settings'

const rolePermissions: Record<UserRole, Permission[]> = {
  superadmin:     ['*'],
  admin:          ['employees', 'branches', 'departments', 'attendance', 'salary', 'bonus', 'kpi', 'leaves', 'settings'],
  hr_manager:     ['employees', 'attendance', 'bonus', 'kpi', 'leaves'],
  branch_manager: ['attendance', 'leaves'],
  accountant:     ['salary', 'bonus'],
  employee:       ['attendance.own', 'leaves.own', 'kpi.own'],
}

export function usePermission() {
  const auth = useAuthStore()

  const can = computed(() => (permission: Permission): boolean => {
    const role = auth.user?.role
    if (!role) return false
    const perms = rolePermissions[role] ?? []
    return perms.includes('*') || perms.includes(permission)
  })

  const canAny = computed(() => (...permissions: Permission[]): boolean => {
    return permissions.some((p) => can.value(p))
  })

  const isRole = computed(() => (...roles: UserRole[]): boolean => {
    return roles.includes(auth.user?.role as UserRole)
  })

  return { can, canAny, isRole }
}