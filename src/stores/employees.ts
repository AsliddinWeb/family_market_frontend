import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import type { EmployeeOut, EmployeeCreate, EmployeeUpdate, PaginatedEmployees, EmployeeParams } from '@/types'

export const useEmployeeStore = defineStore('employees', () => {
  const items      = ref<EmployeeOut[]>([])
  const total      = ref(0)
  const page       = ref(1)
  const size       = ref(20)
  const loading    = ref(false)
  const selected   = ref<EmployeeOut | null>(null)

  const filters = ref<EmployeeParams>({
    search:        '',
    branch_id:     undefined,
    department_id: undefined,
    is_active:     undefined,
  })

  async function fetchAll() {
    loading.value = true
    try {
      const params: Record<string, any> = {
        page: page.value,
        size: size.value,
      }
      if (filters.value.search)        params.search        = filters.value.search
      if (filters.value.branch_id)     params.branch_id     = filters.value.branch_id
      if (filters.value.department_id) params.department_id = filters.value.department_id
      if (filters.value.is_active !== undefined) params.is_active = filters.value.is_active

      const { data } = await api.get<PaginatedEmployees>('/api/employees', { params })
      items.value = data.items
      total.value = data.total
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: number) {
    const { data } = await api.get<EmployeeOut>(`/api/employees/${id}`)
    selected.value = data
    return data
  }

  async function create(payload: EmployeeCreate) {
    const { data } = await api.post<EmployeeOut>('/api/employees', payload)
    await fetchAll()
    return data
  }

  async function update(id: number, payload: EmployeeUpdate) {
    const { data } = await api.patch<EmployeeOut>(`/api/employees/${id}`, payload)
    if (selected.value?.id === id) selected.value = data
    await fetchAll()
    return data
  }

  async function remove(id: number) {
    await api.delete(`/api/employees/${id}`)
    await fetchAll()
  }

  function setPage(p: number) {
    page.value = p
    fetchAll()
  }

  function setFilters(f: Partial<EmployeeParams>) {
    filters.value = { ...filters.value, ...f }
    page.value = 1
    fetchAll()
  }

  function resetFilters() {
    filters.value = { search: '', branch_id: undefined, department_id: undefined, is_active: undefined }
    page.value = 1
    fetchAll()
  }

  return {
    items, total, page, size, loading, selected, filters,
    fetchAll, fetchOne, create, update, remove,
    setPage, setFilters, resetFilters,
  }
})