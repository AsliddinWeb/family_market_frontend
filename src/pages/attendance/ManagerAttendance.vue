<script setup lang="ts">
/**
 * ManagerAttendance.vue
 */
import { ref, computed, onMounted } from 'vue'
import {
  Plus, Filter, RefreshCw, Clock, CheckCircle2,
  XCircle, AlertCircle, Users, Building2, LogIn, LogOut,
  MapPin, Camera, Edit2, Trash2,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import api from '@/composables/useApi'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import { usePermission } from '@/composables/usePermission'
import { formatDate, formatTime, todayISO, currentYearMonth } from '@/utils/format'
import type { AttendanceOut, AttendanceSummary, AttendanceStatus, BranchOut, EmployeeOut } from '@/types'

const toast = useToastStore()
const { confirm } = useConfirm()
const { isRole } = usePermission()
const isSuperAdmin = computed(() => isRole.value('superadmin', 'admin'))
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// ── Lookup data ───────────────────────────────────────────────────────────
const branches  = ref<BranchOut[]>([])
const employees = ref<EmployeeOut[]>([])

async function fetchBranches() {
  try {
    const { data } = await api.get('/api/branches', { params: { size: 100 } })
    branches.value = data.items ?? []
  } catch { /* silent */ }
}
async function fetchEmployees() {
  try {
    const { data } = await api.get('/api/employees', { params: { size: 100, is_active: true } })
    employees.value = data.items ?? []
  } catch { /* silent */ }
}

// ── Tabs ──────────────────────────────────────────────────────────────────
type Tab = 'today' | 'history' | 'summary'
const activeTab = ref<Tab>('today')

// ── TODAY ─────────────────────────────────────────────────────────────────
const todayRecords  = ref<AttendanceOut[]>([])
const todayLoading  = ref(false)
const todayBranchId = ref<number | undefined>(undefined)

const sortedToday = computed(() =>
  [...todayRecords.value].sort((a, b) => {
    if (!a.check_in_time) return 1
    if (!b.check_in_time) return -1
    return b.check_in_time.localeCompare(a.check_in_time)
  })
)

const filteredToday = computed(() =>
  todayBranchId.value
    ? sortedToday.value.filter(r => r.employee?.branch_id === todayBranchId.value)
    : sortedToday.value
)

const todayStats = computed(() => ({
  present: filteredToday.value.filter(r => r.status === 'present').length,
  late:    filteredToday.value.filter(r => r.status === 'late').length,
  absent:  filteredToday.value.filter(r => r.status === 'absent').length,
  total:   filteredToday.value.length,
}))

async function fetchToday() {
  todayLoading.value = true
  try {
    const today = todayISO()
    const { data } = await api.get('/api/attendance', {
      params: { date_from: today, date_to: today, size: 100 },
    })
    todayRecords.value = data.items ?? []
  } catch {
    toast.error('Bugungi davomat yuklanmadi')
  } finally {
    todayLoading.value = false
  }
}

// ── DETAIL MODAL ──────────────────────────────────────────────────────────
const showDetail = ref(false)
const detailRec  = ref<AttendanceOut | null>(null)

function openDetail(rec: AttendanceOut) {
  detailRec.value  = rec
  showDetail.value = true
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────
const showEdit  = ref(false)
const editSaving = ref(false)
const editForm  = ref({
  check_in_time:  '',
  check_out_time: '',
  status:         'present' as AttendanceStatus,
  notes:          '',
  late_minutes:   0,
})

function openEdit(rec: AttendanceOut) {
  editForm.value = {
    check_in_time:  rec.check_in_time  ? formatTime(rec.check_in_time)  : '',
    check_out_time: rec.check_out_time ? formatTime(rec.check_out_time) : '',
    status:         rec.status,
    notes:          rec.notes ?? '',
    late_minutes:   rec.late_minutes ?? 0,
  }
  showEdit.value = true
}

async function saveEdit() {
  if (!detailRec.value) return
  editSaving.value = true
  try {
    const payload: any = {
      status:       editForm.value.status,
      late_minutes: editForm.value.late_minutes,
    }
    if (editForm.value.check_in_time)  payload.check_in_time  = `${editForm.value.check_in_time}:00`
    if (editForm.value.check_out_time) payload.check_out_time = `${editForm.value.check_out_time}:00`
    if (editForm.value.notes)          payload.notes          = editForm.value.notes
    await api.patch(`/api/attendance/${detailRec.value.id}`, payload)
    toast.success('Davomat yangilandi')
    showEdit.value   = false
    showDetail.value = false
    fetchToday()
    if (activeTab.value === 'history') fetchHistory()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally {
    editSaving.value = false
  }
}

function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${BASE_URL}/media/${path}`
}

function hasValidCoords(loc: { latitude: number; longitude: number } | null): boolean {
  return !!loc && (loc.latitude !== 0 || loc.longitude !== 0)
}

function locationUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`
}

// ── HISTORY ───────────────────────────────────────────────────────────────
const historyRecords = ref<AttendanceOut[]>([])
const historyTotal   = ref(0)
const historyPage    = ref(1)
const historyLoading = ref(false)

const filters = ref({
  employee_id: undefined as number | undefined,
  branch_id:   undefined as number | undefined,
  date_from:   todayISO(),
  date_to:     todayISO(),
  status:      '' as AttendanceStatus | '',
})

const totalPages = computed(() => Math.ceil(historyTotal.value / 20))

async function fetchHistory() {
  historyLoading.value = true
  try {
    const params: Record<string, any> = { page: historyPage.value, size: 20 }
    if (filters.value.employee_id) params.employee_id = filters.value.employee_id
    if (filters.value.branch_id)   params.branch_id   = filters.value.branch_id
    if (filters.value.date_from)   params.date_from   = filters.value.date_from
    if (filters.value.date_to)     params.date_to     = filters.value.date_to
    if (filters.value.status)      params.status      = filters.value.status
    const { data } = await api.get('/api/attendance', { params })
    historyRecords.value = data.items ?? []
    historyTotal.value   = data.total ?? 0
  } catch {
    toast.error('Tarix yuklanmadi')
  } finally {
    historyLoading.value = false
  }
}

function applyFilters() { historyPage.value = 1; fetchHistory() }
function changePage(p: number) { historyPage.value = p; fetchHistory() }

// ── SUMMARY ───────────────────────────────────────────────────────────────
const { year: initYear, month: initMonth } = currentYearMonth()
const summaryFilter  = ref({ employee_id: 0, year: initYear, month: initMonth })
const summary        = ref<AttendanceSummary | null>(null)
const summaryLoading = ref(false)

async function loadSummary() {
  if (!summaryFilter.value.employee_id) { toast.warning('Xodim tanlang'); return }
  summaryLoading.value = true
  summary.value = null
  try {
    const { data } = await api.get('/api/attendance/summary', {
      params: {
        employee_id: summaryFilter.value.employee_id,
        year:        summaryFilter.value.year,
        month:       summaryFilter.value.month,
      },
    })
    summary.value = data
  } catch {
    toast.error('Xulosa yuklanmadi')
  } finally {
    summaryLoading.value = false
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────
async function deleteAttendance(rec: AttendanceOut) {
  const ok = await confirm({
    title: "O'chirish",
    message: `${rec.employee?.full_name ?? 'Xodim'} ning ${formatDate(rec.date)} davomatini o'chirmoqchimisiz?`,
    type: 'warning',
  })
  if (!ok) return
  try {
    await api.delete(`/api/attendance/${rec.id}`)
    toast.success("O'chirildi")
    showDetail.value = false
    showEdit.value   = false
    fetchToday()
    if (activeTab.value === 'history') fetchHistory()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  }
}

// ── MANUAL ENTRY MODAL ────────────────────────────────────────────────────
const showModal = ref(false)
const saving    = ref(false)
const form      = ref({
  employee_id:    0,
  date:           todayISO(),
  check_in_time:  '',
  check_out_time: '',
  status:         'present' as AttendanceStatus,
  notes:          '',
})
const fErrors = ref<Record<string, string>>({})

function openModal() {
  form.value    = { employee_id: 0, date: todayISO(), check_in_time: '', check_out_time: '', status: 'present', notes: '' }
  fErrors.value = {}
  showModal.value = true
}

function validate() {
  fErrors.value = {}
  if (!form.value.employee_id) { fErrors.value.employee_id = 'Xodim tanlang'; return false }
  if (!form.value.date)        { fErrors.value.date = 'Sana kiritilishi shart'; return false }
  return true
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const payload: any = {
      employee_id: form.value.employee_id,
      date:        form.value.date,
      status:      form.value.status,
    }
    if (form.value.check_in_time)  payload.check_in_time  = `${form.value.check_in_time}:00`
    if (form.value.check_out_time) payload.check_out_time = `${form.value.check_out_time}:00`
    if (form.value.notes)          payload.notes          = form.value.notes
    await api.post('/api/attendance', payload)
    toast.success("Davomat qo'shildi")
    showModal.value = false
    fetchToday()
    if (activeTab.value === 'history') fetchHistory()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally {
    saving.value = false
  }
}

function refresh() {
  if (activeTab.value === 'today')        fetchToday()
  else if (activeTab.value === 'history') fetchHistory()
}

onMounted(() => {
  fetchToday()
  fetchHistory()
  fetchBranches()
  fetchEmployees()
})

// ── Helpers ───────────────────────────────────────────────────────────────
const historyColumns = [
  { key: 'employee',  label: 'Xodim',     mobileTitle: true },
  { key: 'date',      label: 'Sana' },
  { key: 'check_in',  label: 'Kelish' },
  { key: 'check_out', label: 'Ketish' },
  { key: 'late',      label: 'Kechikish' },
  { key: 'status',    label: 'Holat' },
  { key: 'actions',   label: '', align: 'right' as const },
]

const statusBg: Record<string, string> = {
  present:  'bg-green-50  dark:bg-green-900/20  border-green-100  dark:border-green-800/30',
  late:     'bg-amber-50  dark:bg-amber-900/20  border-amber-100  dark:border-amber-800/30',
  absent:   'bg-red-50    dark:bg-red-900/20    border-red-100    dark:border-red-800/30',
  half_day: 'bg-blue-50   dark:bg-blue-900/20   border-blue-100   dark:border-blue-800/30',
  holiday:  'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/30',
}
const statusIconMap: Record<string, any> = {
  present: CheckCircle2, late: AlertCircle, absent: XCircle, half_day: Clock, holiday: CheckCircle2,
}
const statusIconColor: Record<string, string> = {
  present:  'text-green-500',
  late:     'text-amber-500',
  absent:   'text-red-500',
  half_day: 'text-blue-400',
  holiday:  'text-purple-500',
}

const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const selectCls = 'w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500'
</script>

<template>
  <div>
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Davomat</h1>
          <p class="text-sm text-gray-400 mt-0.5">Xodimlar kelish-ketishi monitoring</p>
        </div>
        <div class="flex items-center gap-2">
          <AppButton variant="ghost" size="sm" :loading="todayLoading || historyLoading" @click="refresh">
            <component :is="RefreshCw" class="w-4 h-4" />
            Yangilash
          </AppButton>
          <AppButton variant="primary" @click="openModal">
            <component :is="Plus" class="w-4 h-4" />
            Qo'shish
          </AppButton>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard :icon="CheckCircle2" label="Keldi"      :value="todayStats.present" color="green" />
        <StatCard :icon="AlertCircle"  label="Kech keldi" :value="todayStats.late"    color="amber" />
        <StatCard :icon="XCircle"      label="Kelmadi"    :value="todayStats.absent"  color="red" />
        <StatCard :icon="Users"        label="Jami qayd"  :value="todayStats.total"   color="blue" />
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        <button
          v-for="tab in [
            { key: 'today',   label: 'Bugungi' },
            { key: 'history', label: 'Tarix' },
            { key: 'summary', label: 'Xulosa' },
          ]"
          :key="tab.key"
          :class="[
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
            activeTab === tab.key
              ? 'bg-white dark:bg-[#1a1d27] text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          ]"
          @click="activeTab = tab.key as Tab"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- ── BUGUNGI ──────────────────────────────────────────────────── -->
      <template v-if="activeTab === 'today'">

        <div class="flex items-center gap-2 flex-wrap">
          <button
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
              !todayBranchId
                ? 'bg-primary-500 text-white border-primary-500'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400',
            ]"
            @click="todayBranchId = undefined"
          >
            Barchasi
            <span class="ml-1.5 text-xs opacity-75">({{ todayRecords.length }})</span>
          </button>
          <button
            v-for="b in branches" :key="b.id"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5',
              todayBranchId === b.id
                ? 'bg-primary-500 text-white border-primary-500'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400',
            ]"
            @click="todayBranchId = b.id"
          >
            <component :is="Building2" class="w-3.5 h-3.5" />
            {{ b.name }}
            <span class="text-xs opacity-75">({{ todayRecords.filter(r => r.employee?.branch_id === b.id).length }})</span>
          </button>
        </div>

        <div v-if="todayLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div v-for="i in 8" :key="i" class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <SkeletonLoader variant="text" class="w-20" />
            <SkeletonLoader variant="text" class="w-32" />
            <SkeletonLoader variant="text" class="w-24" />
          </div>
        </div>

        <div v-else-if="!filteredToday.length" class="flex flex-col items-center justify-center py-20 text-center">
          <component :is="Users" class="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
          <p class="text-sm font-medium text-gray-500">
            {{ todayBranchId ? "Bu filial bo'yicha bugun qayd yo'q" : 'Bugun hech kim qayd etilmadi' }}
          </p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div
            v-for="(rec, idx) in filteredToday" :key="rec.id"
            :class="['rounded-2xl border p-4 transition-shadow hover:shadow-md cursor-pointer', statusBg[rec.status]]"
            :style="`animation: fadeInRow 150ms ease forwards; animation-delay: ${idx * 20}ms; opacity: 0`"
            @click="openDetail(rec)"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 dark:bg-black/20">
                <component :is="statusIconMap[rec.status]" :class="['w-5 h-5', statusIconColor[rec.status]]" />
              </div>
              <AppBadge :variant="rec.status" size="sm" />
            </div>
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {{ rec.employee?.full_name ?? `Xodim #${rec.employee_id}` }}
            </p>
            <div class="flex items-center gap-1 mt-0.5">
              <component :is="Building2" class="w-3 h-3 text-gray-400 shrink-0" />
              <p class="text-xs text-gray-500 truncate">{{ rec.employee?.branch?.name ?? '—' }}</p>
            </div>
            <div class="my-3 border-t border-black/5 dark:border-white/5" />
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <component :is="LogIn" class="w-3.5 h-3.5 text-green-500" />
                <span class="font-mono font-medium">{{ rec.check_in_time ? formatTime(rec.check_in_time) : '—' }}</span>
              </div>
              <div class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <component :is="LogOut" class="w-3.5 h-3.5 text-red-400" />
                <span class="font-mono font-medium">{{ rec.check_out_time ? formatTime(rec.check_out_time) : '—' }}</span>
              </div>
            </div>
            <div v-if="rec.late_minutes > 0" class="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <component :is="Clock" class="w-3 h-3" />
              <span>{{ rec.late_minutes }} daqiqa kechikdi</span>
            </div>
            <div class="mt-2">
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {{ rec.source === 'telegram' ? '🤖 Telegram' : rec.source === 'web' ? '💻 Tizim' : rec.source === 'manual' ? '✍️ Qo\'l' : rec.source }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- ── TARIX ────────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'history'">
        <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <div>
              <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Filial</label>
              <select v-model="filters.branch_id" :class="selectCls">
                <option :value="undefined">Barcha filiallar</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Xodim</label>
              <select v-model="filters.employee_id" :class="selectCls">
                <option :value="undefined">Barcha xodimlar</option>
                <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
              </select>
            </div>
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
              <select v-model="filters.status" :class="selectCls">
                <option value="">Barchasi</option>
                <option value="present">Keldi</option>
                <option value="late">Kech keldi</option>
                <option value="absent">Kelmadi</option>
                <option value="half_day">Yarim kun</option>
              </select>
            </div>
          </div>
          <div class="flex items-center justify-between pt-1">
            <p class="text-sm text-gray-400">Jami: <span class="font-medium text-gray-600 dark:text-gray-300">{{ historyTotal }}</span></p>
            <AppButton variant="primary" size="sm" @click="applyFilters">
              <component :is="Filter" class="w-3.5 h-3.5" />
              Ko'rsatish
            </AppButton>
          </div>
        </div>

        <AppTable :columns="historyColumns" :rows="historyRecords" :loading="historyLoading" empty-text="Davomat yozuvlari topilmadi">
          <template #cell-employee="{ row }">
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100 text-sm">{{ row.employee?.full_name ?? `#${row.employee_id}` }}</p>
              <p class="text-xs text-gray-400">{{ row.employee?.branch?.name ?? '—' }}</p>
            </div>
          </template>
          <template #cell-date="{ row }">
            <span class="text-sm">{{ formatDate(row.date) }}</span>
          </template>
          <template #cell-check_in="{ row }">
            <span class="text-sm font-mono">{{ row.check_in_time ? formatTime(row.check_in_time) : '—' }}</span>
          </template>
          <template #cell-check_out="{ row }">
            <span class="text-sm font-mono">{{ row.check_out_time ? formatTime(row.check_out_time) : '—' }}</span>
          </template>
          <template #cell-late="{ row }">
            <span :class="row.late_minutes > 0 ? 'text-amber-500 font-medium' : 'text-gray-400'" class="text-sm">
              {{ row.late_minutes > 0 ? `+${row.late_minutes} daq` : '—' }}
            </span>
          </template>
          <template #cell-status="{ row }">
            <AppBadge :variant="row.status" />
          </template>
          <template #cell-actions="{ row }">
            <button
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              :title="'Tahrirlash'"
              @click="detailRec = row; openEdit(row)"
            >
              <component :is="Edit2" class="w-4 h-4" />
            </button>
            <button
              v-if="isSuperAdmin"
              class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="O'chirish"
              @click="detailRec = row; deleteAttendance(row)"
            >
              <component :is="Trash2" class="w-4 h-4" />
            </button>
          </template>
        </AppTable>

        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
          <AppButton variant="ghost" size="sm" :disabled="historyPage === 1" @click="changePage(historyPage - 1)">←</AppButton>
          <span class="text-sm text-gray-500">{{ historyPage }} / {{ totalPages }}</span>
          <AppButton variant="ghost" size="sm" :disabled="historyPage === totalPages" @click="changePage(historyPage + 1)">→</AppButton>
        </div>
      </template>

      <!-- ── XULOSA ────────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'summary'">
        <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Oylik xulosa</h2>
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex-1 min-w-[160px]">
              <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Xodim</label>
              <select v-model.number="summaryFilter.employee_id" :class="selectCls">
                <option :value="0">Xodim tanlang</option>
                <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Yil</label>
              <input v-model.number="summaryFilter.year" type="number" min="2020" max="2030"
                class="w-24 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Oy</label>
              <select v-model.number="summaryFilter.month" class="w-32 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
                <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
              </select>
            </div>
            <AppButton variant="primary" size="sm" :loading="summaryLoading" :disabled="!summaryFilter.employee_id" @click="loadSummary">
              Ko'rish
            </AppButton>
          </div>
          <div v-if="summaryLoading" class="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SkeletonLoader v-for="i in 5" :key="i" variant="text" class="h-20" />
          </div>
          <div v-else-if="summary" class="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
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
          <div v-else class="mt-6 text-center text-sm text-gray-400">
            Xodim va oyni tanlab "Ko'rish" tugmasini bosing
          </div>
        </div>
      </template>

    </div>

    <!-- ── Manual Entry Modal ──────────────────────────────────────────── -->
    <AppModal v-model="showModal" title="Davomat qo'shish">
      <div class="space-y-4">
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">
            Xodim <span class="text-red-400">*</span>
          </label>
          <select
            v-model.number="form.employee_id"
            :class="['w-full text-sm border rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500', fErrors.employee_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600']"
          >
            <option :value="0">Xodim tanlang</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
          </select>
          <p v-if="fErrors.employee_id" class="text-xs text-red-500 mt-1">{{ fErrors.employee_id }}</p>
        </div>
        <AppInput v-model="form.date" label="Sana" type="date" required />
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-2">Holat</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="s in (['present', 'late', 'absent', 'half_day'] as const)" :key="s"
              type="button"
              :class="[
                'py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center',
                form.status === s
                  ? 'ring-2 ring-primary-500 ring-offset-1 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
              ]"
              @click="form.status = s"
            >
              <AppBadge :variant="s" :dot="true" size="sm" />
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="form.check_in_time"  label="Kelish vaqti" type="time" />
          <AppInput v-model="form.check_out_time" label="Ketish vaqti" type="time" />
        </div>
        <AppInput v-model="form.notes" label="Izoh" placeholder="Ixtiyoriy..." :maxlength="200" />
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="showModal = false">Bekor qilish</AppButton>
        <AppButton variant="primary" :loading="saving" @click="save">Saqlash</AppButton>
      </template>
    </AppModal>

    <!-- ── Detail Modal ────────────────────────────────────────────────── -->
    <AppModal v-model="showDetail" :title="detailRec?.employee?.full_name ?? 'Davomat tafsiloti'">
      <div v-if="detailRec" class="space-y-4">

        <div class="flex items-center justify-between">
          <AppBadge :variant="detailRec.status" />
          <span class="text-xs text-gray-400">{{ formatDate(detailRec.date) }}</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-800/30">
            <p class="text-[11px] text-green-500 uppercase tracking-wide mb-1">Kelish</p>
            <p class="text-lg font-bold text-green-700 dark:text-green-400 font-mono">
              {{ detailRec.check_in_time ? formatTime(detailRec.check_in_time) : '—' }}
            </p>
          </div>
          <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-800/30">
            <p class="text-[11px] text-red-400 uppercase tracking-wide mb-1">Ketish</p>
            <p class="text-lg font-bold text-red-600 dark:text-red-400 font-mono">
              {{ detailRec.check_out_time ? formatTime(detailRec.check_out_time) : '—' }}
            </p>
          </div>
        </div>

        <div v-if="detailRec.late_minutes > 0" class="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
          <component :is="Clock" class="w-4 h-4 text-amber-500 shrink-0" />
          <span class="text-sm font-medium text-amber-700 dark:text-amber-400">{{ detailRec.late_minutes }} daqiqa kechikdi</span>
        </div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Manba</span>
          <span class="font-medium text-gray-700 dark:text-gray-300">
            {{ detailRec.source === 'telegram' ? '🤖 Telegram bot' : detailRec.source === 'web' ? '💻 Tizim (Web)' : detailRec.source === 'manual' ? '✍️ Qo\'lda kiritilgan' : detailRec.source }}
          </span>
        </div>

        <!-- Kelish rasmi -->
        <div v-if="detailRec.check_in_photo">
          <p class="text-[11px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <component :is="Camera" class="w-3.5 h-3.5" /> Kelish rasmi
          </p>
          <img
            :src="photoUrl(detailRec.check_in_photo) ?? ''"
            alt="Kelish rasmi"
            class="w-full rounded-xl object-cover max-h-56 border border-gray-100 dark:border-gray-700"
          />
        </div>

        <!-- Ketish rasmi -->
        <div v-if="detailRec.check_out_photo">
          <p class="text-[11px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <component :is="Camera" class="w-3.5 h-3.5" /> Ketish rasmi
          </p>
          <img
            :src="photoUrl(detailRec.check_out_photo) ?? ''"
            alt="Ketish rasmi"
            class="w-full rounded-xl object-cover max-h-56 border border-gray-100 dark:border-gray-700"
          />
        </div>

        <!-- Kelish koordinatasi -->
        <div v-if="detailRec.check_in_location">
          <p class="text-[11px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <component :is="MapPin" class="w-3.5 h-3.5" /> Kelish joylashuvi
          </p>
          <div v-if="hasValidCoords(detailRec.check_in_location)">
            <a
              :href="locationUrl(detailRec.check_in_location.latitude, detailRec.check_in_location.longitude)"
              target="_blank"
              class="flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 transition-colors"
            >
              <component :is="MapPin" class="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p class="text-xs font-mono text-blue-700 dark:text-blue-400">
                  {{ detailRec.check_in_location.latitude }}, {{ detailRec.check_in_location.longitude }}
                </p>
                <p class="text-[11px] text-blue-500 mt-0.5">Google Maps da ochish →</p>
              </div>
            </a>
          </div>
          <p v-else class="text-sm text-gray-400">Koordinata aniqlanmadi (0, 0)</p>
        </div>

        <!-- Ketish koordinatasi -->
        <div v-if="detailRec.check_out_location">
          <p class="text-[11px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <component :is="MapPin" class="w-3.5 h-3.5" /> Ketish joylashuvi
          </p>
          <div v-if="hasValidCoords(detailRec.check_out_location)">
            <a
              :href="locationUrl(detailRec.check_out_location.latitude, detailRec.check_out_location.longitude)"
              target="_blank"
              class="flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 transition-colors"
            >
              <component :is="MapPin" class="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p class="text-xs font-mono text-blue-700 dark:text-blue-400">
                  {{ detailRec.check_out_location.latitude }}, {{ detailRec.check_out_location.longitude }}
                </p>
                <p class="text-[11px] text-blue-500 mt-0.5">Google Maps da ochish →</p>
              </div>
            </a>
          </div>
          <p v-else class="text-sm text-gray-400">Koordinata aniqlanmadi (0, 0)</p>
        </div>

        <!-- Izoh -->
        <div v-if="detailRec.notes" class="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-300">
          {{ detailRec.notes }}
        </div>

      </div>
      <template #footer>
        <AppButton v-if="isSuperAdmin" variant="danger" @click="deleteAttendance(detailRec!)">
          <component :is="Trash2" class="w-4 h-4" />
          O'chirish
        </AppButton>
        <AppButton variant="ghost" @click="showDetail = false">Yopish</AppButton>
        <AppButton variant="primary" @click="openEdit(detailRec!)">
          <component :is="Edit2" class="w-4 h-4" />
          Tahrirlash
        </AppButton>
      </template>
    </AppModal>

    <!-- ── Edit Modal ──────────────────────────────────────────────────── -->
    <AppModal v-model="showEdit" title="Davomatni tahrirlash" size="md">
      <div v-if="detailRec" class="space-y-4">

        <!-- Xodim info (readonly) -->
        <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <component :is="Users" class="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ detailRec.employee?.full_name ?? `#${detailRec.employee_id}` }}</p>
            <p class="text-xs text-gray-400">{{ formatDate(detailRec.date) }} · {{ detailRec.source === 'telegram' ? '🤖 Telegram' : '✍️ Qo\'lda' }}</p>
          </div>
        </div>

        <!-- Holat -->
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-2">Holat</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="s in (['present', 'late', 'absent', 'half_day'] as const)" :key="s"
              type="button"
              :class="[
                'py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center',
                editForm.status === s
                  ? 'ring-2 ring-primary-500 ring-offset-1 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
              ]"
              @click="editForm.status = s"
            >
              <AppBadge :variant="s" :dot="true" size="sm" />
            </button>
          </div>
        </div>

        <!-- Vaqtlar -->
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="editForm.check_in_time"  label="Kelish vaqti"  type="time" />
          <AppInput v-model="editForm.check_out_time" label="Ketish vaqti"  type="time" />
        </div>

        <!-- Kechikish -->
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Kechikish (daqiqa)</label>
          <input
            v-model.number="editForm.late_minutes"
            type="number" min="0" max="999"
            class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500"
          />
        </div>

        <!-- Izoh -->
        <AppInput v-model="editForm.notes" label="Izoh" placeholder="Ixtiyoriy..." :maxlength="200" />
      </div>

      <template #footer>
        <AppButton variant="ghost" @click="showEdit = false">Bekor qilish</AppButton>
        <AppButton variant="primary" :loading="editSaving" @click="saveEdit">
          <component :is="Edit2" class="w-4 h-4" />
          Saqlash
        </AppButton>
      </template>
    </AppModal>

  </div>
</template>