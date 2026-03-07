import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import type { AttendanceOut, AttendanceParams, PaginatedAttendance } from '@/types'

export const useAttendanceStore = defineStore('attendance', () => {
  const records   = ref<AttendanceOut[]>([])
  const total     = ref(0)
  const loading   = ref(false)
  const todayFeed = ref<AttendanceOut[]>([])

  async function fetchAttendance(params: AttendanceParams = {}) {
    loading.value = true
    try {
      const { data } = await api.get<PaginatedAttendance>('/api/attendance', { params })
      records.value = data.items ?? []
      total.value   = data.total ?? 0
    } finally {
      loading.value = false
    }
  }

  async function fetchTodayFeed() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await api.get<PaginatedAttendance>('/api/attendance', {
      params: { date_from: today, date_to: today, size: 50 },
    })
    todayFeed.value = data.items ?? []
  }

  return { records, total, loading, todayFeed, fetchAttendance, fetchTodayFeed }
})