import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import router from '@/router'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — token qo'shish
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — xato handling
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    const toast = useToastStore()
    const status = error.response?.status

    if (status === 401) {
      // Refresh token urinib ko'r
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken && !error.config?.url?.includes('/auth/refresh')) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/refresh`,
            { refresh_token: refreshToken },
          )
          localStorage.setItem('access_token', data.access_token)
          // Asl so'rovni qayta yubor
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${data.access_token}`
            return api(error.config)
          }
        } catch {
          // Refresh ham ishlamadi — logout
          const auth = useAuthStore()
          auth.logout()
          router.push('/login')
        }
      } else {
        const auth = useAuthStore()
        auth.logout()
        router.push('/login')
      }
    } else if (status === 422) {
      const detail = error.response?.data?.detail
      if (Array.isArray(detail)) {
        detail.forEach((d: any) => {
          toast.error(d.msg || 'Validation error')
        })
      } else {
        toast.error(detail || 'Validation xatolik')
      }
    } else if (status === 403) {
      toast.error('Ruxsat yo\'q')
    } else if (status === 404) {
      toast.error('Ma\'lumot topilmadi')
    } else if (status && status >= 500) {
      toast.error('Server xatoligi. Keyinroq urinib ko\'ring.')
    }

    return Promise.reject(error)
  },
)

export default api