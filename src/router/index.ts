import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/pages/dashboard/DashboardPage.vue'),
      },
      {
        path: 'employees',
        name: 'employees',
        component: () => import('@/pages/employees/EmployeesPage.vue'),
      },
      {
        path: 'employees/:id',
        name: 'employee-detail',
        component: () => import('@/pages/employees/EmployeeDetailPage.vue'),
      },
      {
        path: 'branches',
        name: 'branches',
        component: () => import('@/pages/branches/BranchesPage.vue'),
      },
      {
        path: 'departments',
        name: 'departments',
        component: () => import('@/pages/departments/DepartmentsPage.vue'),
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('@/pages/attendance/AttendancePage.vue'),
      },
      {
        path: 'salary',
        name: 'salary',
        component: () => import('@/pages/salary/SalaryPage.vue'),
      },
      {
        path: 'bonus-deductions',
        name: 'bonus-deductions',
        component: () => import('@/pages/bonus-deductions/BonusDeductionsPage.vue'),
      },
      {
        path: 'kpi',
        name: 'kpi',
        component: () => import('@/pages/kpi/KpiPage.vue'),
      },
      {
        path: 'leaves',
        name: 'leaves',
        component: () => import('@/pages/leaves/LeavesPage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/settings/SettingsPage.vue'),
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

// Navigation guard
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.requiresAuth === false) {
    // Login sahifasiga kirgan holda token bo'lsa — dashboard ga
    if (auth.isLoggedIn) return { name: 'dashboard' }
    return true
  }

  if (!auth.isLoggedIn) return { name: 'login' }
  return true
})

export default router