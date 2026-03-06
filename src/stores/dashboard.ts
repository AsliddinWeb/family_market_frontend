import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import type { DashboardStats, AttendanceOut } from '@/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats   = ref<DashboardStats | null>(null)
  const feed    = ref<AttendanceOut[]>([])
  const loading = ref(false)

  async function fetchStats() {
    loading.value = true
    try {
      const { data } = await api.get<DashboardStats>('/api/dashboard')
      stats.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchFeed() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await api.get('/api/attendance', {
      params: { date_from: today, date_to: today, size: 10, page: 1 },
    })
    feed.value = data.items ?? []
  }

  return { stats, feed, loading, fetchStats, fetchFeed }
})