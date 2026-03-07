import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    permission?: string  // usePermission can() ga uzatiladigan string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/pages/errors/ForbiddenPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        // dashboard hamma uchun — ichida role-based render
        component: () => import('@/pages/dashboard/DashboardPage.vue'),
      },
      {
        path: 'employees',
        name: 'employees',
        component: () => import('@/pages/employees/EmployeesPage.vue'),
        meta: { permission: 'employees' },
      },
      {
        path: 'employees/:id',
        name: 'employee-detail',
        component: () => import('@/pages/employees/EmployeeDetailPage.vue'),
        meta: { permission: 'employees' },
      },
      {
        path: 'branches',
        name: 'branches',
        component: () => import('@/pages/branches/BranchesPage.vue'),
        meta: { permission: 'branches' },
      },
      {
        path: 'departments',
        name: 'departments',
        component: () => import('@/pages/departments/DepartmentsPage.vue'),
        meta: { permission: 'departments' },
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('@/pages/attendance/AttendancePage.vue'),
        meta: { permission: 'attendance.any' },
      },
      {
        path: 'salary',
        name: 'salary',
        component: () => import('@/pages/salary/SalaryPage.vue'),
        meta: { permission: 'salary' },
      },
      {
        path: 'bonus-deductions',
        name: 'bonus-deductions',
        component: () => import('@/pages/bonus-deductions/BonusDeductionsPage.vue'),
        meta: { permission: 'bonus' },
      },
      {
        path: 'kpi',
        name: 'kpi',
        component: () => import('@/pages/kpi/KpiPage.vue'),
        meta: { permission: 'kpi.any' },
      },
      {
        path: 'leaves',
        name: 'leaves',
        component: () => import('@/pages/leaves/LeavesPage.vue'),
        meta: { permission: 'leaves' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/settings/SettingsPage.vue'),
        meta: { permission: 'settings' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  // Login sahifasi — token bo'lsa dashboard ga
  if (to.meta.requiresAuth === false) {
    if (auth.isLoggedIn) return { name: 'dashboard' }
    return true
  }

  // Token yo'q — login ga
  if (!auth.isLoggedIn) return { name: 'login' }

  // Permission check — route da permission meta bo'lsa
  if (to.meta.permission) {
    const { can, canAny } = usePermission()
    // attendance.any — employee ham kirishi mumkin
    if (to.meta.permission === 'attendance.any') {
      if (!canAny.value('attendance', 'attendance.own')) return { name: 'forbidden' }
    } else if (to.meta.permission === 'kpi.any') {
      if (!canAny.value('kpi', 'kpi.own')) return { name: 'forbidden' }
    } else if (!can.value(to.meta.permission as any)) {
      return { name: 'forbidden' }
    }
  }

  return true
})

export default router