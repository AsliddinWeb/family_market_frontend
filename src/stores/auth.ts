import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserOut, UserRole } from '@/types'
import api from '@/composables/useApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserOut | null>(null)
  const accessToken  = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))

  const isLoggedIn = computed(() => !!accessToken.value)
  const role = computed<UserRole | null>(() => user.value?.role ?? null)

  function setTokens(access: string, refresh: string) {
    accessToken.value  = access
    refreshToken.value = refresh
    localStorage.setItem('access_token',  access)
    localStorage.setItem('refresh_token', refresh)
  }

  async function login(phone: string, password: string) {
    const { data } = await api.post('/api/auth/login', { phone, password })
    setTokens(data.access_token, data.refresh_token)
    await fetchMe()
  }

  async function fetchMe() {
    const { data } = await api.get<UserOut>('/api/auth/me')
    user.value = data
  }

  function logout() {
    user.value     = null
    accessToken.value  = null
    refreshToken.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  async function changePassword(old_password: string, new_password: string) {
    await api.patch('/api/auth/change-password', { old_password, new_password })
  }

  // App start da token bo'lsa userni yuklash
  async function init() {
    if (accessToken.value && !user.value) {
      try {
        await fetchMe()
      } catch {
        logout()
      }
    }
  }

  return {
    user, accessToken, refreshToken,
    isLoggedIn, role,
    login, logout, fetchMe, init, changePassword,
  }
})