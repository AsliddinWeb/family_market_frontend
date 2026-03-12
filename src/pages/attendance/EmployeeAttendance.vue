<script setup lang="ts">
/**
 * EmployeeAttendance.vue
 * Faqat "employee" roli uchun:
 *   - O'z davomatini ko'rish (tarix)
 *   - Oylik xulosa (summary) — employee_id backend tomonidan avtomatik aniqlanadi
 */
import { ref, onMounted } from 'vue'
import { Clock, CheckCircle2, XCircle, AlertCircle, LogIn, LogOut, RefreshCw } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppTable from '@/components/ui/AppTable.vue'
import StatCard from '@/components/ui/StatCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/composables/useApi'
import { formatDate, formatTime, todayISO, currentYearMonth } from '@/utils/format'
import type { AttendanceOut, AttendanceSummary, AttendanceStatus } from '@/types'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

// ── Tarix ─────────────────────────────────────────────────────────────────
const records     = ref<AttendanceOut[]>([])
const total       = ref(0)
const page        = ref(1)
const loading     = ref(false)
const totalPages  = () => Math.ceil(total.value / 20)

const filters = ref({
  date_from: '',
  date_to:   '',
  status:    '' as AttendanceStatus | '',
})

async function fetchHistory() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, size: 20 }
    if (filters.value.date_from) params.date_from = filters.value.date_from
    if (filters.value.date_to)   params.date_to   = filters.value.date_to
    if (filters.value.status)    params.status    = filters.value.status
    // employee_id backend tomonidan token orqali aniqlanadi, yubormasak ham bo'ladi
    const { data } = await api.get('/api/attendance', { params })
    records.value = data.items ?? []
    total.value   = data.total ?? 0
  } catch {
    toast.error('Davomat ma\'lumotlarini olishda xato')
  } finally {
    loading.value = false
  }
}

function applyFilter() { page.value = 1; fetchHistory() }
function changePage(p: number) { page.value = p; fetchHistory() }

// ── Oylik xulosa ──────────────────────────────────────────────────────────
const { year: initYear, month: initMonth } = currentYearMonth()
const summaryYear    = ref(initYear)
const summaryMonth   = ref(initMonth)
const summary        = ref<AttendanceSummary | null>(null)
const summaryLoading = ref(false)

async function fetchSummary() {
  summaryLoading.value = true
  summary.value = null
  try {
    // employee_id = 0 yuboramiz, backend token dan o'zi aniqlab oladi
    const { data } = await api.get('/api/attendance/summary', {
      params: { employee_id: 0, year: summaryYear.value, month: summaryMonth.value },
    })
    summary.value = data
  } catch {
    toast.error('Xulosa yuklanmadi')
  } finally {
    summaryLoading.value = false
  }
}

onMounted(() => {
  fetchHistory()
  fetchSummary()
})

// ── Helpers ───────────────────────────────────────────────────────────────
const columns = [
  { key: 'date',      label: 'Sana',      mobileTitle: true },
  { key: 'check_in',  label: 'Kelish' },
  { key: 'check_out', label: 'Ketish' },
  { key: 'late',      label: 'Kechikish' },
  { key: 'status',    label: 'Holat' },
]

const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']

const selectCls = 'w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500'
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Mening davomatim</h1>
        <p class="text-sm text-gray-400 mt-0.5">Kelish-ketish tarixi va oylik xulosa</p>
      </div>
      <AppButton variant="ghost" size="sm" :loading="loading" @click="fetchHistory">
        <component :is="RefreshCw" class="w-4 h-4" />
        Yangilash
      </AppButton>
    </div>

    <!-- ── Oylik xulosa ──────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Oylik xulosa</h2>
        <div class="flex items-center gap-2">
          <select v-model.number="summaryMonth" :class="'text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500'">
            <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
          </select>
          <input
            v-model.number="summaryYear" type="number" min="2020" max="2030"
            class="w-20 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500"
          />
          <AppButton variant="primary" size="sm" :loading="summaryLoading" @click="fetchSummary">
            Ko'rish
          </AppButton>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="summaryLoading" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SkeletonLoader v-for="i in 5" :key="i" variant="text" class="h-20" />
      </div>

      <!-- Summary cards -->
      <div v-else-if="summary" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-100 dark:border-green-800/30">
          <p class="text-2xl font-bold text-green-600">{{ summary.present }}</p>
          <p class="text-xs text-green-500 mt-1">Keldi</p>
        </div>
        <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800/30">
          <p class="text-2xl font-bold text-amber-600">{{ summary.late }}</p>
          <p class="text-xs text-amber-500 mt-1">Kech keldi</p>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-100 dark:border-red-800/30">
          <p class="text-2xl font-bold text-red-600">{{ summary.absent }}</p>
          <p class="text-xs text-red-500 mt-1">Kelmadi</p>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-800/30">
          <p class="text-2xl font-bold text-blue-600">{{ summary.half_day }}</p>
          <p class="text-xs text-blue-500 mt-1">Yarim kun</p>
        </div>
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
          <p class="text-2xl font-bold text-gray-700 dark:text-gray-200">{{ summary.total_late_minutes }}</p>
          <p class="text-xs text-gray-400 mt-1">Kechikish (daq)</p>
        </div>
      </div>

      <div v-else class="text-center py-6 text-sm text-gray-400">
        Oy va yilni tanlab "Ko'rish" tugmasini bosing
      </div>
    </div>

    <!-- ── Tarix filtrlari ───────────────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Dan</label>
          <input v-model="filters.date_from" type="date" :class="selectCls" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Gacha</label>
          <input v-model="filters.date_to" type="date" :class="selectCls" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Holat</label>
          <select v-model="filters.status" :class="selectCls" style="width:140px">
            <option value="">Barchasi</option>
            <option value="present">Keldi</option>
            <option value="late">Kech keldi</option>
            <option value="absent">Kelmadi</option>
            <option value="half_day">Yarim kun</option>
          </select>
        </div>
        <AppButton variant="primary" size="sm" @click="applyFilter">Ko'rsatish</AppButton>
      </div>
      <p class="text-xs text-gray-400 mt-2">Jami: {{ total }} ta yozuv</p>
    </div>

    <!-- ── Jadval ────────────────────────────────────────────────────── -->
    <AppTable :columns="columns" :rows="records" :loading="loading" empty-text="Davomat yozuvlari topilmadi">

      <template #cell-date="{ row }">
        <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ formatDate(row.date) }}</span>
      </template>

      <template #cell-check_in="{ row }">
        <div class="flex items-center gap-1.5 text-sm">
          <component :is="LogIn" class="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span class="font-mono">{{ row.check_in_time ? formatTime(row.check_in_time) : '—' }}</span>
        </div>
      </template>

      <template #cell-check_out="{ row }">
        <div class="flex items-center gap-1.5 text-sm">
          <component :is="LogOut" class="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span class="font-mono">{{ row.check_out_time ? formatTime(row.check_out_time) : '—' }}</span>
        </div>
      </template>

      <template #cell-late="{ row }">
        <span v-if="row.late_minutes > 0" class="flex items-center gap-1 text-sm text-amber-500 font-medium">
          <component :is="Clock" class="w-3.5 h-3.5" />
          +{{ row.late_minutes }} daq
        </span>
        <span v-else class="text-gray-400 text-sm">—</span>
      </template>

      <template #cell-status="{ row }">
        <AppBadge :variant="row.status" />
      </template>
    </AppTable>

    <!-- Pagination -->
    <div v-if="totalPages() > 1" class="flex items-center justify-center gap-2">
      <AppButton variant="ghost" size="sm" :disabled="page === 1" @click="changePage(page - 1)">←</AppButton>
      <span class="text-sm text-gray-500">{{ page }} / {{ totalPages() }}</span>
      <AppButton variant="ghost" size="sm" :disabled="page === totalPages()" @click="changePage(page + 1)">→</AppButton>
    </div>

  </div>
</template>