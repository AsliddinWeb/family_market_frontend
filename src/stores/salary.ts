import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import type { SalaryRecordOut, SalaryParams, PaginatedSalaryRecords } from '@/types'

export const useSalaryStore = defineStore('salary', () => {
  const records  = ref<SalaryRecordOut[]>([])
  const total    = ref(0)
  const loading  = ref(false)
  const period   = ref({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })

  async function fetchSalary(params: SalaryParams = {}) {
    loading.value = true
    try {
      const { data } = await api.get<PaginatedSalaryRecords>('/api/salary', { params })
      records.value = data.items ?? []
      total.value   = data.total ?? 0
    } finally {
      loading.value = false
    }
  }

  async function updateStatus(id: number, status: 'draft' | 'approved' | 'paid') {
    await api.patch(`/api/salary/${id}/status`, { status })
  }

  return { records, total, loading, period, fetchSalary, updateStatus }
})