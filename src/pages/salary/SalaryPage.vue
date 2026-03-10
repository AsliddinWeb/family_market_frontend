<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus, RefreshCw, DollarSign, CheckCircle2,
  FileText, Wallet, Filter, Users, Calendar } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import { usePermission } from '@/composables/usePermission'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTable from '@/components/ui/AppTable.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import api from '@/composables/useApi'
import { formatMoney, formatMonth, currentYearMonth } from '@/utils/format'
import type { SalaryRecordOut, BonusOut, DeductionOut, EmployeeOut } from '@/types'

const toast       = useToastStore()
const { confirm } = useConfirm()
const { can, isRole } = usePermission()

// ── Role ruxsatlari ───────────────────────────────────────────────────────────
// superadmin, admin  → yaratish + tasdiqlash + to'lash
// accountant         → ko'rish + to'lash
// hr_manager         → sahifaga kirish yo'q (router bloklaydi)
const canCreate  = computed(() => isRole.value('superadmin', 'admin'))
const canApprove = computed(() => isRole.value('superadmin', 'admin'))
const canPay     = computed(() => can.value('salary'))  // admin + accountant

// ── Period ────────────────────────────────────────────────────────────────────
const { year: initYear, month: initMonth } = currentYearMonth()
const filterYear   = ref(initYear)
const filterMonth  = ref(initMonth)
const filterStatus = ref('')
const years  = Array.from({ length: 5 }, (_, i) => initYear - 2 + i)
const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']

// ── Records ───────────────────────────────────────────────────────────────────
const records    = ref<SalaryRecordOut[]>([])
const total      = ref(0)
const page       = ref(1)
const loading    = ref(false)
const totalPages = computed(() => Math.ceil(total.value / 20))

const stats = computed(() => ({
  draft:    records.value.filter(r => r.status === 'draft').length,
  approved: records.value.filter(r => r.status === 'approved').length,
  paid:     records.value.filter(r => r.status === 'paid').length,
  totalNet: records.value.reduce((s, r) => s + Number(r.net_salary ?? 0), 0),
}))

async function fetchRecords() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, size: 20, year: filterYear.value, month: filterMonth.value }
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/api/salary', { params })
    records.value = data.items ?? []
    total.value   = data.total ?? 0
  } catch { toast.error('Oylik ma\'lumotlarini olishda xato') }
  finally { loading.value = false }
}

function applyFilter() { page.value = 1; fetchRecords() }
function changePage(p: number) { page.value = p; fetchRecords() }
onMounted(fetchRecords)

// ── Employees ─────────────────────────────────────────────────────────────────
const employees  = ref<EmployeeOut[]>([])
const empLoading = ref(false)

async function fetchEmployees() {
  if (employees.value.length) return
  empLoading.value = true
  try {
    const { data } = await api.get('/api/employees', { params: { size: 100, is_active: true } })
    employees.value = data.items ?? []
  } finally { empLoading.value = false }
}

function empName(id: number) {
  return employees.value.find(e => e.id === id)?.full_name ?? `#${id}`
}

// ── Create modal ──────────────────────────────────────────────────────────────
const showCreate   = ref(false)
const creating     = ref(false)
const selectedEmps = ref<number[]>([])
const createYear   = ref(initYear)
const createMonth  = ref(initMonth)

// Preview: har xodim uchun bonus/deduction preview
interface EmpPreview { bonusTotal: number; deductionTotal: number; loading: boolean }
const empPreviews = ref<Record<number, EmpPreview>>({})

async function fetchPreviewForEmp(empId: number) {
  empPreviews.value[empId] = { bonusTotal: 0, deductionTotal: 0, loading: true }
  try {
    const params = { employee_id: empId, year: createYear.value, month: createMonth.value, size: 100 }
    const [b, d] = await Promise.all([
      api.get('/api/bonuses',    { params }),
      api.get('/api/deductions', { params }),
    ])
    const bonusTotal     = (b.data.items ?? []).reduce((s: number, x: any) => s + Number(x.amount), 0)
    const deductionTotal = (d.data.items ?? []).reduce((s: number, x: any) => s + Number(x.amount), 0)
    empPreviews.value[empId] = { bonusTotal, deductionTotal, loading: false }
  } catch {
    empPreviews.value[empId] = { bonusTotal: 0, deductionTotal: 0, loading: false }
  }
}

async function openCreate() {
  await fetchEmployees()
  selectedEmps.value = []
  empPreviews.value  = {}
  createYear.value   = filterYear.value
  createMonth.value  = filterMonth.value
  showCreate.value   = true
  employees.value.forEach(emp => fetchPreviewForEmp(emp.id))
}

async function onCreatePeriodChange() {
  empPreviews.value = {}
  employees.value.forEach(emp => fetchPreviewForEmp(emp.id))
}

function toggleAll() {
  selectedEmps.value =
    selectedEmps.value.length === employees.value.length
      ? [] : employees.value.map(e => e.id)
}

function netForEmp(emp: EmployeeOut): number {
  const p = empPreviews.value[emp.id]
  if (!p || p.loading) return Number(emp.base_salary)
  return Number(emp.base_salary) + p.bonusTotal - p.deductionTotal
}

const selectedTotal = computed(() =>
  selectedEmps.value.reduce((sum, id) => {
    const emp = employees.value.find(e => e.id === id)
    return sum + (emp ? netForEmp(emp) : 0)
  }, 0)
)

async function createSalaries() {
  if (!selectedEmps.value.length) { toast.warning('Kamida 1 ta xodim tanlang'); return }
  creating.value = true
  let ok = 0, skip = 0, fail = 0
  for (const emp_id of selectedEmps.value) {
    try {
      await api.post('/api/salary', { employee_id: emp_id, period_year: createYear.value, period_month: createMonth.value })
      ok++
    } catch (err: any) {
      if (err?.response?.status === 409) skip++ // allaqachon mavjud
      else fail++
    }
  }
  creating.value = false; showCreate.value = false
  const parts = []
  if (ok)   parts.push(`${ok} ta yaratildi`)
  if (skip) parts.push(`${skip} ta allaqachon mavjud`)
  if (fail) parts.push(`${fail} ta xato`)
  if (ok)   toast.success(parts.join(', '))
  else if (skip) toast.warning(parts.join(', '))
  else toast.error(parts.join(', '))
  fetchRecords()
}

// ── Status workflow ───────────────────────────────────────────────────────────
const updatingId = ref<number | null>(null)

async function updateStatus(rec: SalaryRecordOut, newStatus: string) {
  const labels: Record<string, string> = { approved: 'tasdiqlash', paid: 'to\'langan deb belgilash', draft: 'qoralamaga qaytarish' }
  const ok = await confirm({ title: 'Status o\'zgartirish', message: `Oylikni ${labels[newStatus] ?? newStatus}ni tasdiqlaysizmi?`, type: newStatus === 'paid' ? 'warning' : 'info' })
  if (!ok) return
  updatingId.value = rec.id
  try {
    await api.patch(`/api/salary/${rec.id}/status`, { status: newStatus })
    toast.success('Status yangilandi')
    fetchRecords()
  } catch { toast.error('Xato yuz berdi') }
  finally { updatingId.value = null }
}

// ── Batch to'lov ──────────────────────────────────────────────────────────────
const selected    = ref<number[]>([])
const batchPaying = ref(false)
const approvedIds = computed(() => records.value.filter(r => r.status === 'approved').map(r => r.id))

function toggleRow(id: number) {
  const i = selected.value.indexOf(id)
  if (i === -1) selected.value.push(id); else selected.value.splice(i, 1)
}
function toggleSelectAll() {
  selected.value = selected.value.length === approvedIds.value.length ? [] : [...approvedIds.value]
}

async function batchPay() {
  if (!selected.value.length) return
  const ok = await confirm({ title: 'Batch to\'lov', message: `${selected.value.length} ta oylikni to'langan deb belgilansinmi?`, type: 'warning' })
  if (!ok) return
  batchPaying.value = true
  let success = 0
  for (const id of selected.value) {
    try { await api.patch(`/api/salary/${id}/status`, { status: 'paid' }); success++ } catch {}
  }
  batchPaying.value = false; selected.value = []
  toast.success(`${success} ta oylik to'landi`)
  fetchRecords()
}

// ── Detail modal ──────────────────────────────────────────────────────────────
const showDetail       = ref(false)
const detailRec        = ref<SalaryRecordOut | null>(null)
const detailBonuses    = ref<BonusOut[]>([])
const detailDeductions = ref<DeductionOut[]>([])
const detailLoading    = ref(false)

async function openDetail(rec: SalaryRecordOut) {
  detailRec.value = rec; showDetail.value = true; detailLoading.value = true
  try {
    const [b, d] = await Promise.all([
      api.get('/api/bonuses',    { params: { employee_id: rec.employee_id, year: rec.period_year, month: rec.period_month, size: 50 } }),
      api.get('/api/deductions', { params: { employee_id: rec.employee_id, year: rec.period_year, month: rec.period_month, size: 50 } }),
    ])
    detailBonuses.value = b.data.items ?? []; detailDeductions.value = d.data.items ?? []
  } finally { detailLoading.value = false }
}

// ── Table ─────────────────────────────────────────────────────────────────────
const columns = [
  { key: 'chk',       label: '',         width: '40px' },
  { key: 'employee',  label: 'Xodim',    mobileTitle: true },
  { key: 'base',      label: 'Asosiy',   responsive: 'md' },
  { key: 'bonus',     label: 'Bonus',    responsive: 'md' },
  { key: 'deduction', label: 'Jarima',   responsive: 'md' },
  { key: 'net',       label: 'Sof maosh' },
  { key: 'status',    label: 'Holat' },
  { key: 'actions',   label: '',         align: 'right' as const },
]
</script>

<template>
  <div>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Oylik</h1>
        <p class="text-sm text-gray-400 mt-0.5">Xodimlar maoshi boshqaruvi</p>
      </div>
      <div class="flex items-center gap-2">
        <AppButton variant="ghost" size="sm" :loading="loading" @click="fetchRecords">
          <component :is="RefreshCw" class="w-4 h-4" />
        </AppButton>
        <AppButton v-if="canCreate" variant="primary" @click="openCreate">
          <component :is="Plus" class="w-4 h-4" />
          <span class="hidden sm:inline">Oylik yaratish</span>
        </AppButton>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :icon="FileText"     label="Qoralama"     :value="stats.draft"               color="indigo" />
      <StatCard :icon="CheckCircle2" label="Tasdiqlangan" :value="stats.approved"            color="blue"   />
      <StatCard :icon="DollarSign"   label="To'landi"     :value="stats.paid"                color="green"  />
      <StatCard :icon="Wallet"       label="Jami to'lov"  :value="formatMoney(stats.totalNet)" color="amber"  />
    </div>

    <!-- Filter bar -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Yil</label>
          <select v-model.number="filterYear" class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Oy</label>
          <select v-model.number="filterMonth" class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Holat</label>
          <select v-model="filterStatus" class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
            <option value="">Barchasi</option>
            <option value="draft">Qoralama</option>
            <option value="approved">Tasdiqlangan</option>
            <option value="paid">To'landi</option>
          </select>
        </div>
        <AppButton variant="primary" size="sm" @click="applyFilter">
          <component :is="Filter" class="w-3.5 h-3.5" />
          Ko'rsatish
        </AppButton>
        <div v-if="canPay && approvedIds.length" class="ml-auto flex items-center gap-3">
          <!-- Select all -->
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox"
              :checked="selected.length === approvedIds.length && approvedIds.length > 0"
              class="w-4 h-4 rounded accent-primary-500"
              @change="toggleSelectAll" />
            <span class="text-sm text-gray-500">
              {{ selected.length ? `${selected.length} ta tanlandi` : 'Barchasini tanlash' }}
            </span>
          </label>
          <AppButton v-if="selected.length" variant="primary" size="sm" :loading="batchPaying" @click="batchPay">
            <component :is="DollarSign" class="w-3.5 h-3.5" />
            Batch to'lov
          </AppButton>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-2">{{ formatMonth(filterYear, filterMonth) }} — {{ total }} ta yozuv</p>
    </div>

    <!-- Table -->
    <AppTable :columns="columns" :rows="records" :loading="loading" empty-text="Bu davr uchun oylik yozuvi topilmadi">
      <template #cell-chk="{ row }">
        <input v-if="canPay && row.status === 'approved'" type="checkbox" :checked="selected.includes(row.id)"
          class="w-4 h-4 rounded accent-primary-500 cursor-pointer" @change="toggleRow(row.id)" />
      </template>
      <template #cell-employee="{ row }">
        <div>
          <p class="font-medium text-sm text-gray-900 dark:text-gray-100">
            {{ row.employee?.full_name ?? empName(row.employee_id) }}
          </p>
          <p class="text-xs text-gray-400">{{ formatMonth(row.period_year, row.period_month) }}</p>
        </div>
      </template>
      <template #cell-base="{ row }">
        <span class="text-sm font-mono text-gray-600 dark:text-gray-300">{{ formatMoney(Number(row.base_salary)) }}</span>
      </template>
      <template #cell-bonus="{ row }">
        <span class="text-sm font-mono text-green-600">+{{ formatMoney(Number(row.total_bonus ?? 0)) }}</span>
      </template>
      <template #cell-deduction="{ row }">
        <span class="text-sm font-mono text-red-500">-{{ formatMoney(Number(row.total_deduction ?? 0)) }}</span>
      </template>
      <template #cell-net="{ row }">
        <span class="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">{{ formatMoney(Number(row.net_salary)) }}</span>
      </template>
      <template #cell-status="{ row }">
        <AppBadge :variant="row.status" />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500 transition-colors" @click="openDetail(row)" title="Tafsilot">
            <component :is="FileText" class="w-3.5 h-3.5" />
          </button>
          <button v-if="canApprove && row.status === 'draft'" :disabled="updatingId === row.id"
            class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
            @click="updateStatus(row, 'approved')">Tasdiqlash</button>
          <button v-if="canPay && row.status === 'approved'" :disabled="updatingId === row.id"
            class="px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
            @click="updateStatus(row, 'paid')">To'lash</button>
        </div>
      </template>
    </AppTable>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <AppButton variant="ghost" size="sm" :disabled="page === 1" @click="changePage(page - 1)">←</AppButton>
      <span class="text-sm text-gray-500">{{ page }} / {{ totalPages }}</span>
      <AppButton variant="ghost" size="sm" :disabled="page === totalPages" @click="changePage(page + 1)">→</AppButton>
    </div>
  </div>

  <!-- Create Modal -->
  <AppModal v-model="showCreate" title="Oylik yaratish" size="lg">
    <div class="space-y-4">
      <!-- Period selector -->
      <div class="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
        <component :is="Calendar" class="w-4 h-4 text-primary-500 shrink-0" />
        <span class="text-sm text-primary-700 dark:text-primary-300 font-medium shrink-0">Davr:</span>
        <select v-model.number="createYear" @change="onCreatePeriodChange"
          class="text-sm bg-white dark:bg-gray-800 border border-primary-200 dark:border-primary-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
          <option v-for="y in [initYear-1, initYear, initYear+1]" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model.number="createMonth" @change="onCreatePeriodChange"
          class="text-sm bg-white dark:bg-gray-800 border border-primary-200 dark:border-primary-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}-oy</option>
        </select>
        <span class="text-xs text-primary-600 dark:text-primary-400 ml-auto">{{ formatMonth(createYear, createMonth) }} uchun</span>
      </div>

      <!-- Employee list with preview -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <!-- Header -->
        <div class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <input type="checkbox" :checked="selectedEmps.length === employees.length && employees.length > 0" class="w-4 h-4 accent-primary-500" @change="toggleAll" />
          <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Xodim</span>
          <span class="text-[10px] text-green-500 font-semibold uppercase tracking-wider w-20 text-right">Bonus</span>
          <span class="text-[10px] text-red-400 font-semibold uppercase tracking-wider w-20 text-right">Jarima</span>
          <span class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-24 text-right">Sof maosh</span>
        </div>

        <div v-if="empLoading" class="p-4 space-y-2">
          <SkeletonLoader v-for="i in 4" :key="i" variant="text" />
        </div>

        <div v-else class="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
          <label
            v-for="emp in employees" :key="emp.id"
            :class="['grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 cursor-pointer transition-colors', selectedEmps.includes(emp.id) ? 'bg-primary-50/40 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50']">
            <input type="checkbox" :value="emp.id" v-model="selectedEmps" class="w-4 h-4 accent-primary-500" />

            <!-- Xodim info -->
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ emp.full_name }}</p>
              <p class="text-xs text-gray-400">{{ emp.position ?? '—' }} · {{ formatMoney(Number(emp.base_salary)) }}</p>
            </div>

            <!-- Bonus -->
            <div class="w-20 text-right">
              <span v-if="empPreviews[emp.id]?.loading" class="text-xs text-gray-300 dark:text-gray-600">...</span>
              <span v-else-if="(empPreviews[emp.id]?.bonusTotal ?? 0) > 0" class="text-xs font-mono font-semibold text-green-600">
                +{{ formatMoney(empPreviews[emp.id]?.bonusTotal ?? 0) }}
              </span>
              <span v-else class="text-xs text-gray-300 dark:text-gray-600">—</span>
            </div>

            <!-- Jarima -->
            <div class="w-20 text-right">
              <span v-if="empPreviews[emp.id]?.loading" class="text-xs text-gray-300 dark:text-gray-600">...</span>
              <span v-else-if="(empPreviews[emp.id]?.deductionTotal ?? 0) > 0" class="text-xs font-mono font-semibold text-red-500">
                -{{ formatMoney(empPreviews[emp.id]?.deductionTotal ?? 0) }}
              </span>
              <span v-else class="text-xs text-gray-300 dark:text-gray-600">—</span>
            </div>

            <!-- Net maosh -->
            <div class="w-24 text-right">
              <span v-if="empPreviews[emp.id]?.loading" class="text-xs text-gray-300 dark:text-gray-600">...</span>
              <span v-else class="text-sm font-bold font-mono" :class="netForEmp(emp) >= Number(emp.base_salary) ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'">
                {{ formatMoney(netForEmp(emp)) }}
              </span>
            </div>
          </label>
        </div>
      </div>

      <!-- Tanlangan xodimlar jami -->
      <div v-if="selectedEmps.length > 0" class="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <span class="text-sm text-gray-500">{{ selectedEmps.length }} ta xodim · jami to'lov:</span>
        <span class="text-base font-bold font-mono text-gray-900 dark:text-gray-100">{{ formatMoney(selectedTotal) }}</span>
      </div>
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="showCreate = false">Bekor qilish</AppButton>
      <AppButton variant="primary" :loading="creating" :disabled="!selectedEmps.length" @click="createSalaries">
        <component :is="Plus" class="w-4 h-4" />
        Yaratish ({{ selectedEmps.length }})
      </AppButton>
    </template>
  </AppModal>

  <!-- Detail Modal -->
  <AppModal v-model="showDetail"
    :title="detailRec ? `${detailRec.employee?.full_name ?? '#' + detailRec.employee_id} — ${formatMonth(detailRec.period_year, detailRec.period_month)}` : 'Tafsilot'"
    size="lg">
    <div v-if="detailLoading" class="space-y-3">
      <SkeletonLoader v-for="i in 6" :key="i" variant="text" />
    </div>
    <div v-else-if="detailRec" class="space-y-5">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Asosiy maosh</p>
          <p class="text-base font-bold font-mono text-gray-900 dark:text-gray-100">{{ formatMoney(Number(detailRec.base_salary)) }}</p>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
          <p class="text-xs text-green-500 mb-1">Jami bonus</p>
          <p class="text-base font-bold font-mono text-green-600">+{{ formatMoney(Number(detailRec.total_bonus ?? 0)) }}</p>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <p class="text-xs text-red-400 mb-1">Jami jarima</p>
          <p class="text-base font-bold font-mono text-red-500">-{{ formatMoney(Number(detailRec.total_deduction ?? 0)) }}</p>
        </div>
        <div class="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3">
          <p class="text-xs text-primary-500 mb-1">Sof maosh</p>
          <p class="text-base font-bold font-mono text-primary-600">{{ formatMoney(Number(detailRec.net_salary)) }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <AppBadge :variant="detailRec.status" />
        <span v-if="detailRec.paid_at" class="text-xs text-gray-400">To'langan: {{ detailRec.paid_at?.slice(0, 10) }}</span>
      </div>
      <div>
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bonuslar ({{ detailBonuses.length }})</h4>
        <p v-if="!detailBonuses.length" class="text-sm text-gray-400">Bonus yo'q</p>
        <div v-else class="space-y-1">
          <div v-for="b in detailBonuses" :key="b.id" class="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50 dark:bg-green-900/10">
            <div>
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ b.reason ?? '—' }}</span>
              <span class="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">{{ b.bonus_type }}</span>
            </div>
            <span class="text-sm font-mono font-medium text-green-600">+{{ formatMoney(Number(b.amount)) }}</span>
          </div>
        </div>
      </div>
      <div>
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Jarimalar ({{ detailDeductions.length }})</h4>
        <p v-if="!detailDeductions.length" class="text-sm text-gray-400">Jarima yo'q</p>
        <div v-else class="space-y-1">
          <div v-for="d in detailDeductions" :key="d.id" class="flex items-center justify-between py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/10">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ d.reason ?? '—' }}</span>
              <span v-if="d.auto_generated" class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">auto</span>
            </div>
            <span class="text-sm font-mono font-medium text-red-500">-{{ formatMoney(Number(d.amount)) }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppModal>
  </div>
</template>