<script setup lang="ts">
/**
 * SalaryBranchPage.vue — Filial ichidagi oylik sahifasi
 * Props: branchId, year, month
 * Oylar jadvali (tepada) + Xodimlar oylik jadvali (pastda)
 * Oylik yaratish, tasdiqlash, to'lash
 */
import { ref, computed, onMounted, watch } from 'vue'
import {
  ArrowLeft, Plus, RefreshCw, DollarSign, CheckCircle2,
  FileText, Wallet, Filter, Users, Calendar, Building2,
  ChevronDown, ChevronUp,
} from 'lucide-vue-next'
import AppButton      from '@/components/ui/AppButton.vue'
import AppBadge       from '@/components/ui/AppBadge.vue'
import AppModal       from '@/components/ui/AppModal.vue'
import AppTable       from '@/components/ui/AppTable.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import StatCard       from '@/components/ui/StatCard.vue'
import { useToastStore }  from '@/stores/toast'
import { useConfirm }     from '@/composables/useConfirm'
import { usePermission }  from '@/composables/usePermission'
import api from '@/composables/useApi'
import { formatMoney, formatMonth, currentYearMonth } from '@/utils/format'
import type { BranchOut, SalaryRecordOut, BonusOut, DeductionOut, EmployeeOut } from '@/types'

// ── Props / Emits ─────────────────────────────────────────────────────────
const props = defineProps<{
  branchId: number
  initYear:  number
  initMonth: number
}>()
const emit = defineEmits<{ (e: 'back'): void }>()

const toast       = useToastStore()
const { confirm } = useConfirm()
const { isRole, can }   = usePermission()

const canCreate  = computed(() => isRole.value('superadmin', 'admin'))
const canApprove = computed(() => isRole.value('superadmin', 'admin'))
const canPay     = computed(() => can.value('salary'))

// ── Period ────────────────────────────────────────────────────────────────
const filterYear  = ref(props.initYear)
const filterMonth = ref(props.initMonth)
const { year: curYear } = currentYearMonth()
const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun',
                'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const years  = Array.from({ length: 5 }, (_, i) => curYear - 2 + i)

// ── Branch info ───────────────────────────────────────────────────────────
const branch    = ref<BranchOut | null>(null)
const employees = ref<EmployeeOut[]>([])

async function fetchBranch() {
  try {
    const { data } = await api.get(`/api/branches/${props.branchId}`)
    branch.value = data
  } catch { /* silent */ }
}

async function fetchEmployees() {
  try {
    const { data } = await api.get('/api/employees', {
      params: { branch_id: props.branchId, size: 100, is_active: true },
    })
    employees.value = data.items ?? []
  } catch { /* silent */ }
}

// ── Salary records (joriy oy) ─────────────────────────────────────────────
const records    = ref<SalaryRecordOut[]>([])
const loading    = ref(false)

async function fetchRecords() {
  loading.value = true
  try {
    const { data } = await api.get('/api/salary', {
      params: {
        branch_id:   props.branchId,
        year:        filterYear.value,
        month:       filterMonth.value,
        size:        100,
      },
    })
    records.value = data.items ?? []
  } catch {
    toast.error('Oylik ma\'lumotlari yuklanmadi')
  } finally {
    loading.value = false
  }
}

// ── Oylar jadvali (summary by month) ─────────────────────────────────────
interface MonthSummary {
  year:     number
  month:    number
  count:    number
  totalNet: number
  bonus:    number
  deduct:   number
  paid:     number
  approved: number
  draft:    number
}

const monthSummaries   = ref<MonthSummary[]>([])
const monthsLoading    = ref(false)
const showMonthsTable  = ref(true)

async function fetchMonthSummaries() {
  monthsLoading.value = true
  try {
    // So'nggi 6 oy uchun yig'ma ma'lumot olamiz
    const promises = []
    for (let i = 0; i < 6; i++) {
      let m = filterMonth.value - i
      let y = filterYear.value
      if (m <= 0) { m += 12; y -= 1 }
      promises.push(
        api.get('/api/salary', { params: { branch_id: props.branchId, year: y, month: m, size: 100 } })
          .then(r => ({ year: y, month: m, items: r.data.items ?? [] }))
          .catch(() => ({ year: y, month: m, items: [] }))
      )
    }
    const results = await Promise.all(promises)
    monthSummaries.value = results
      .filter(r => r.items.length > 0)
      .map(r => ({
        year:     r.year,
        month:    r.month,
        count:    r.items.length,
        totalNet: r.items.reduce((s: number, x: any) => s + Number(x.net_salary ?? 0), 0),
        bonus:    r.items.reduce((s: number, x: any) => s + Number(x.total_bonus ?? 0), 0),
        deduct:   r.items.reduce((s: number, x: any) => s + Number(x.total_deduction ?? 0), 0),
        paid:     r.items.filter((x: any) => x.status === 'paid').length,
        approved: r.items.filter((x: any) => x.status === 'approved').length,
        draft:    r.items.filter((x: any) => x.status === 'draft').length,
      }))
  } finally {
    monthsLoading.value = false
  }
}

// ── Stats (joriy oy) ──────────────────────────────────────────────────────
const stats = computed(() => ({
  draft:    records.value.filter(r => r.status === 'draft').length,
  approved: records.value.filter(r => r.status === 'approved').length,
  paid:     records.value.filter(r => r.status === 'paid').length,
  totalNet: records.value.reduce((s, r) => s + Number(r.net_salary ?? 0), 0),
}))

// ── Create modal ──────────────────────────────────────────────────────────
const showCreate   = ref(false)
const creating     = ref(false)
const selectedEmps = ref<number[]>([])

interface EmpPreview { bonusTotal: number; deductionTotal: number; loading: boolean }
const empPreviews = ref<Record<number, EmpPreview>>({})

async function fetchPreviewForEmp(empId: number) {
  empPreviews.value[empId] = { bonusTotal: 0, deductionTotal: 0, loading: true }
  try {
    const params = { employee_id: empId, year: filterYear.value, month: filterMonth.value, size: 100 }
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

// Allaqachon oylik yaratilgan xodimlar
const alreadyCreated = computed(() => new Set(records.value.map(r => r.employee_id)))

// Faqat oylik yaratilmagan xodimlar
const availableEmps = computed(() =>
  employees.value.filter(e => !alreadyCreated.value.has(e.id))
)

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

function toggleAll() {
  selectedEmps.value =
    selectedEmps.value.length === availableEmps.value.length
      ? [] : availableEmps.value.map(e => e.id)
}

async function openCreate() {
  selectedEmps.value = []
  empPreviews.value  = {}
  showCreate.value   = true
  availableEmps.value.forEach(emp => fetchPreviewForEmp(emp.id))
}

async function createSalaries() {
  if (!selectedEmps.value.length) { toast.warning('Kamida 1 ta xodim tanlang'); return }
  creating.value = true
  let ok = 0, skip = 0, fail = 0
  for (const emp_id of selectedEmps.value) {
    try {
      await api.post('/api/salary', {
        employee_id:  emp_id,
        period_year:  filterYear.value,
        period_month: filterMonth.value,
      })
      ok++
    } catch (err: any) {
      if (err?.response?.status === 409) skip++
      else fail++
    }
  }
  creating.value   = false
  showCreate.value = false
  const parts = []
  if (ok)   parts.push(`${ok} ta yaratildi`)
  if (skip) parts.push(`${skip} ta allaqachon mavjud`)
  if (fail) parts.push(`${fail} ta xato`)
  if (ok)       toast.success(parts.join(', '))
  else if (skip) toast.warning(parts.join(', '))
  else           toast.error(parts.join(', '))
  await fetchRecords()
  await fetchMonthSummaries()
}

// ── Status workflow ───────────────────────────────────────────────────────
const updatingId = ref<number | null>(null)

async function updateStatus(rec: SalaryRecordOut, newStatus: string) {
  const labels: Record<string, string> = {
    approved: 'tasdiqlash',
    paid:     'to\'langan deb belgilash',
    draft:    'qoralamaga qaytarish',
  }
  const ok = await confirm({
    title:   'Status o\'zgartirish',
    message: `Oylikni ${labels[newStatus] ?? newStatus}ni tasdiqlaysizmi?`,
    type:    newStatus === 'paid' ? 'warning' : 'info',
  })
  if (!ok) return
  updatingId.value = rec.id
  try {
    await api.patch(`/api/salary/${rec.id}/status`, { status: newStatus })
    toast.success('Status yangilandi')
    await fetchRecords()
    await fetchMonthSummaries()
  } catch {
    toast.error('Xato yuz berdi')
  } finally {
    updatingId.value = null
  }
}

// ── Batch to'lov ──────────────────────────────────────────────────────────
const selected    = ref<number[]>([])
const batchPaying = ref(false)
const approvedIds = computed(() => records.value.filter(r => r.status === 'approved').map(r => r.id))

function toggleRow(id: number) {
  const i = selected.value.indexOf(id)
  if (i === -1) selected.value.push(id); else selected.value.splice(i, 1)
}
function toggleSelectAll() {
  selected.value = selected.value.length === approvedIds.value.length
    ? [] : [...approvedIds.value]
}

async function batchPay() {
  if (!selected.value.length) return
  const ok = await confirm({
    title:   'Batch to\'lov',
    message: `${selected.value.length} ta oylikni to'langan deb belgilansinmi?`,
    type:    'warning',
  })
  if (!ok) return
  batchPaying.value = true
  let success = 0
  for (const id of selected.value) {
    try { await api.patch(`/api/salary/${id}/status`, { status: 'paid' }); success++ } catch {}
  }
  batchPaying.value = false
  selected.value    = []
  toast.success(`${success} ta oylik to'landi`)
  await fetchRecords()
  await fetchMonthSummaries()
}

// ── Detail modal ──────────────────────────────────────────────────────────
const showDetail       = ref(false)
const detailRec        = ref<SalaryRecordOut | null>(null)
const detailBonuses    = ref<BonusOut[]>([])
const detailDeductions = ref<DeductionOut[]>([])
const detailLoading    = ref(false)

async function openDetail(rec: SalaryRecordOut) {
  detailRec.value  = rec
  showDetail.value = true
  detailLoading.value = true
  try {
    const [b, d] = await Promise.all([
      api.get('/api/bonuses',    { params: { employee_id: rec.employee_id, year: rec.period_year, month: rec.period_month, size: 50 } }),
      api.get('/api/deductions', { params: { employee_id: rec.employee_id, year: rec.period_year, month: rec.period_month, size: 50 } }),
    ])
    detailBonuses.value    = b.data.items ?? []
    detailDeductions.value = d.data.items ?? []
  } finally {
    detailLoading.value = false
  }
}

// ── Table columns ─────────────────────────────────────────────────────────
const columns = [
  { key: 'chk',       label: '',          width: '40px' },
  { key: 'employee',  label: 'Xodim',     mobileTitle: true },
  { key: 'base',      label: 'Asosiy',    responsive: 'md' },
  { key: 'bonus',     label: 'Bonus',     responsive: 'md' },
  { key: 'deduction', label: 'Jarima',    responsive: 'md' },
  { key: 'net',       label: 'Sof maosh' },
  { key: 'status',    label: 'Holat' },
  { key: 'actions',   label: '',          align: 'right' as const },
]

const monthColumns = [
  { key: 'period',    label: 'Oy' },
  { key: 'count',     label: 'Xodimlar' },
  { key: 'bonus',     label: 'Bonus',    responsive: 'md' },
  { key: 'deduct',    label: 'Jarima',   responsive: 'md' },
  { key: 'totalNet',  label: 'Jami sof' },
  { key: 'statuses',  label: 'Holat' },
]

const selectCls = 'text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500'

// ── Init ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchBranch(), fetchEmployees()])
  await Promise.all([fetchRecords(), fetchMonthSummaries()])
})

async function applyFilter() {
  await Promise.all([fetchRecords(), fetchMonthSummaries()])
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          class="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          @click="emit('back')"
        >
          <component :is="ArrowLeft" class="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <div class="flex items-center gap-2">
            <component :is="Building2" class="w-4 h-4 text-primary-500" />
            <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ branch?.name ?? 'Filial' }}
            </h1>
          </div>
          <p class="text-sm text-gray-400 mt-0.5">Oylik boshqaruvi</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <AppButton variant="ghost" size="sm" :loading="loading" @click="fetchRecords">
          <component :is="RefreshCw" class="w-4 h-4" />
        </AppButton>
        <AppButton v-if="canCreate && availableEmps.length > 0" variant="primary" @click="openCreate">
          <component :is="Plus" class="w-4 h-4" />
          <span class="hidden sm:inline">Oylik yaratish</span>
        </AppButton>
      </div>
    </div>

    <!-- Period filter -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex items-center gap-2 text-primary-500">
          <component :is="Calendar" class="w-4 h-4" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Davr:</span>
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Yil</label>
          <select v-model.number="filterYear" :class="selectCls">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Oy</label>
          <select v-model.number="filterMonth" :class="selectCls">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
        <AppButton variant="primary" size="sm" @click="applyFilter">
          <component :is="Filter" class="w-3.5 h-3.5" />
          Ko'rsatish
        </AppButton>
        <p class="ml-auto text-sm text-gray-400 self-end">
          {{ formatMonth(filterYear, filterMonth) }} — {{ records.length }} ta xodim
        </p>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :icon="Wallet"       label="Jami to'lov"    :value="formatMoney(stats.totalNet)" color="blue"   />
      <StatCard :icon="CheckCircle2" label="To'landi"        :value="stats.paid"                 color="green"  />
      <StatCard :icon="FileText"     label="Tasdiqlangan"    :value="stats.approved"              color="indigo" />
      <StatCard :icon="Users"        label="Qoralama"        :value="stats.draft"                 color="amber"  />
    </div>

    <!-- ── OYLAR JADVALI ──────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <!-- Collapsible header -->
      <button
        class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        @click="showMonthsTable = !showMonthsTable"
      >
        <div class="flex items-center gap-2">
          <component :is="Calendar" class="w-4 h-4 text-primary-500" />
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Oylar bo'yicha tarix
          </span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
            {{ monthSummaries.length }} oy
          </span>
        </div>
        <component :is="showMonthsTable ? ChevronUp : ChevronDown" class="w-4 h-4 text-gray-400" />
      </button>

      <div v-show="showMonthsTable">
        <div v-if="monthsLoading" class="p-4 space-y-2">
          <SkeletonLoader v-for="i in 3" :key="i" variant="text" />
        </div>
        <div v-else-if="!monthSummaries.length" class="px-5 py-6 text-center text-sm text-gray-400">
          Hali oylik yozuvlari mavjud emas
        </div>
        <AppTable
          v-else
          :columns="monthColumns"
          :rows="monthSummaries"
          empty-text="Oylik yozuvi topilmadi"
        >
          <template #cell-period="{ row }">
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ formatMonth(row.year, row.month) }}
            </span>
          </template>
          <template #cell-count="{ row }">
            <div class="flex items-center gap-1.5">
              <component :is="Users" class="w-3.5 h-3.5 text-gray-400" />
              <span class="text-sm text-gray-600 dark:text-gray-300">{{ row.count }} ta</span>
            </div>
          </template>
          <template #cell-bonus="{ row }">
            <span class="text-sm font-mono text-green-600">+{{ formatMoney(row.bonus) }}</span>
          </template>
          <template #cell-deduct="{ row }">
            <span class="text-sm font-mono text-red-500">-{{ formatMoney(row.deduct) }}</span>
          </template>
          <template #cell-totalNet="{ row }">
            <span class="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
              {{ formatMoney(row.totalNet) }}
            </span>
          </template>
          <template #cell-statuses="{ row }">
            <div class="flex items-center gap-1.5">
              <span v-if="row.paid > 0"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 font-medium">
                ✓{{ row.paid }}
              </span>
              <span v-if="row.approved > 0"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-medium">
                ●{{ row.approved }}
              </span>
              <span v-if="row.draft > 0"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 font-medium">
                ○{{ row.draft }}
              </span>
            </div>
          </template>
        </AppTable>
      </div>
    </div>

    <!-- ── XODIMLAR OYLIK JADVALI ─────────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <component :is="Users" class="w-4 h-4 text-primary-500" />
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ formatMonth(filterYear, filterMonth) }} — Xodimlar
          </span>
        </div>
        <!-- Batch to'lov -->
        <div v-if="canPay && approvedIds.length > 0" class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              :checked="selected.length === approvedIds.length && approvedIds.length > 0"
              class="w-4 h-4 rounded accent-primary-500"
              @change="toggleSelectAll"
            />
            <span class="text-xs text-gray-500">
              {{ selected.length ? `${selected.length} ta tanlandi` : 'Barchasini tanlash' }}
            </span>
          </label>
          <AppButton
            v-if="selected.length"
            variant="primary"
            size="sm"
            :loading="batchPaying"
            @click="batchPay"
          >
            <component :is="DollarSign" class="w-3.5 h-3.5" />
            Batch to'lov
          </AppButton>
        </div>
      </div>

      <AppTable
        :columns="columns"
        :rows="records"
        :loading="loading"
        empty-text="Bu davr uchun oylik yozuvi topilmadi"
      >
        <template #cell-chk="{ row }">
          <input
            v-if="canPay && row.status === 'approved'"
            type="checkbox"
            :checked="selected.includes(row.id)"
            class="w-4 h-4 rounded accent-primary-500 cursor-pointer"
            @change="toggleRow(row.id)"
          />
        </template>
        <template #cell-employee="{ row }">
          <div>
            <p class="font-medium text-sm text-gray-900 dark:text-gray-100">
              {{ row.employee?.full_name ?? `#${row.employee_id}` }}
            </p>
            <p class="text-xs text-gray-400">{{ row.employee?.position ?? '—' }}</p>
          </div>
        </template>
        <template #cell-base="{ row }">
          <span class="text-sm font-mono text-gray-600 dark:text-gray-300">
            {{ formatMoney(Number(row.base_salary)) }}
          </span>
        </template>
        <template #cell-bonus="{ row }">
          <span class="text-sm font-mono text-green-600">
            +{{ formatMoney(Number(row.total_bonus ?? 0)) }}
          </span>
        </template>
        <template #cell-deduction="{ row }">
          <span class="text-sm font-mono text-red-500">
            -{{ formatMoney(Number(row.total_deduction ?? 0)) }}
          </span>
        </template>
        <template #cell-net="{ row }">
          <span class="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
            {{ formatMoney(Number(row.net_salary)) }}
          </span>
        </template>
        <template #cell-status="{ row }">
          <AppBadge :variant="row.status" />
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <button
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500 transition-colors"
              title="Tafsilot"
              @click="openDetail(row)"
            >
              <component :is="FileText" class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="canApprove && row.status === 'draft'"
              :disabled="updatingId === row.id"
              class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
              @click="updateStatus(row, 'approved')"
            >
              Tasdiqlash
            </button>
            <button
              v-if="canPay && row.status === 'approved'"
              :disabled="updatingId === row.id"
              class="px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
              @click="updateStatus(row, 'paid')"
            >
              To'lash
            </button>
          </div>
        </template>
      </AppTable>
    </div>

  </div>

  <!-- ── Create Modal ──────────────────────────────────────────────────── -->
  <AppModal v-model="showCreate" title="Oylik yaratish" size="lg">
    <div class="space-y-4">
      <!-- Period -->
      <div class="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
        <component :is="Calendar" class="w-4 h-4 text-primary-500 shrink-0" />
        <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
          {{ formatMonth(filterYear, filterMonth) }} uchun
        </span>
        <span class="text-xs text-primary-500 ml-auto">
          {{ availableEmps.length }} ta xodim uchun yaratiladi
        </span>
      </div>

      <!-- Employee list -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <input
            type="checkbox"
            :checked="selectedEmps.length === availableEmps.length && availableEmps.length > 0"
            class="w-4 h-4 accent-primary-500"
            @change="toggleAll"
          />
          <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Xodim</span>
          <span class="text-[10px] text-green-500 font-semibold uppercase tracking-wider w-20 text-right">Bonus</span>
          <span class="text-[10px] text-red-400 font-semibold uppercase tracking-wider w-20 text-right">Jarima</span>
          <span class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-24 text-right">Sof maosh</span>
        </div>

        <div class="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
          <div
            v-if="!availableEmps.length"
            class="p-6 text-center text-sm text-gray-400"
          >
            Bu oy uchun barcha xodimlar oylik allaqachon yaratilgan
          </div>
          <label
            v-for="emp in availableEmps" :key="emp.id"
            :class="[
              'grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
              selectedEmps.includes(emp.id)
                ? 'bg-primary-50/40 dark:bg-primary-900/10'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
            ]"
          >
            <input type="checkbox" :value="emp.id" v-model="selectedEmps" class="w-4 h-4 accent-primary-500" />
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ emp.full_name }}</p>
              <p class="text-xs text-gray-400">{{ emp.position ?? '—' }} · {{ formatMoney(Number(emp.base_salary)) }}</p>
            </div>
            <div class="w-20 text-right">
              <span v-if="empPreviews[emp.id]?.loading" class="text-xs text-gray-300 dark:text-gray-600">...</span>
              <span v-else-if="(empPreviews[emp.id]?.bonusTotal ?? 0) > 0" class="text-xs font-mono font-semibold text-green-600">
                +{{ formatMoney(empPreviews[emp.id]?.bonusTotal ?? 0) }}
              </span>
              <span v-else class="text-xs text-gray-300 dark:text-gray-600">—</span>
            </div>
            <div class="w-20 text-right">
              <span v-if="empPreviews[emp.id]?.loading" class="text-xs text-gray-300 dark:text-gray-600">...</span>
              <span v-else-if="(empPreviews[emp.id]?.deductionTotal ?? 0) > 0" class="text-xs font-mono font-semibold text-red-500">
                -{{ formatMoney(empPreviews[emp.id]?.deductionTotal ?? 0) }}
              </span>
              <span v-else class="text-xs text-gray-300 dark:text-gray-600">—</span>
            </div>
            <div class="w-24 text-right">
              <span v-if="empPreviews[emp.id]?.loading" class="text-xs text-gray-300 dark:text-gray-600">...</span>
              <span
                v-else
                class="text-sm font-bold font-mono"
                :class="netForEmp(emp) >= Number(emp.base_salary) ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'"
              >
                {{ formatMoney(netForEmp(emp)) }}
              </span>
            </div>
          </label>
        </div>
      </div>

      <!-- Jami -->
      <div
        v-if="selectedEmps.length > 0"
        class="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
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

  <!-- ── Detail Modal ──────────────────────────────────────────────────── -->
  <AppModal
    v-model="showDetail"
    :title="detailRec
      ? `${detailRec.employee?.full_name ?? '#' + detailRec.employee_id} — ${formatMonth(detailRec.period_year, detailRec.period_month)}`
      : 'Tafsilot'"
    size="lg"
  >
    <div v-if="detailLoading" class="space-y-3">
      <SkeletonLoader v-for="i in 6" :key="i" variant="text" />
    </div>
    <div v-else-if="detailRec" class="space-y-5">
      <!-- Asosiy raqamlar -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Asosiy maosh</p>
          <p class="text-base font-bold font-mono text-gray-900 dark:text-gray-100">
            {{ formatMoney(Number(detailRec.base_salary)) }}
          </p>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
          <p class="text-xs text-green-500 mb-1">Jami bonus</p>
          <p class="text-base font-bold font-mono text-green-600">
            +{{ formatMoney(Number(detailRec.total_bonus ?? 0)) }}
          </p>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <p class="text-xs text-red-400 mb-1">Jami jarima</p>
          <p class="text-base font-bold font-mono text-red-500">
            -{{ formatMoney(Number(detailRec.total_deduction ?? 0)) }}
          </p>
        </div>
        <div class="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3">
          <p class="text-xs text-primary-500 mb-1">Sof maosh</p>
          <p class="text-base font-bold font-mono text-primary-600">
            {{ formatMoney(Number(detailRec.net_salary)) }}
          </p>
        </div>
      </div>

      <!-- Kechikish / ta'til chegirmalari -->
      <div
        v-if="Number(detailRec.late_deduction ?? 0) > 0 || Number(detailRec.leave_deduction ?? 0) > 0"
        class="space-y-2"
      >
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avtomatik chegirmalar</p>
        <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-900/10">
          <span class="text-sm text-gray-600 dark:text-gray-300">Kechikish uchun</span>
          <span class="text-sm font-mono text-amber-600">-{{ formatMoney(Number(detailRec.late_deduction ?? 0)) }}</span>
        </div>
        <div
          v-if="Number(detailRec.leave_deduction ?? 0) > 0"
          class="flex items-center justify-between py-2 px-3 rounded-lg bg-orange-50 dark:bg-orange-900/10"
        >
          <span class="text-sm text-gray-600 dark:text-gray-300">Ta'til (to'lovsiz)</span>
          <span class="text-sm font-mono text-orange-500">-{{ formatMoney(Number(detailRec.leave_deduction ?? 0)) }}</span>
        </div>
      </div>

      <!-- Status -->
      <div class="flex items-center gap-3">
        <AppBadge :variant="detailRec.status" />
        <span v-if="detailRec.paid_at" class="text-xs text-gray-400">
          To'langan: {{ detailRec.paid_at?.slice(0, 10) }}
        </span>
      </div>

      <!-- Bonuslar -->
      <div>
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Bonuslar ({{ detailBonuses.length }})
        </h4>
        <p v-if="!detailBonuses.length" class="text-sm text-gray-400">Bonus yo'q</p>
        <div v-else class="space-y-1">
          <div
            v-for="b in detailBonuses" :key="b.id"
            class="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50 dark:bg-green-900/10"
          >
            <div>
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ b.reason ?? '—' }}</span>
              <span class="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                {{ b.bonus_type }}
              </span>
            </div>
            <span class="text-sm font-mono font-medium text-green-600">+{{ formatMoney(Number(b.amount)) }}</span>
          </div>
        </div>
      </div>

      <!-- Jarimalar -->
      <div>
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Jarimalar ({{ detailDeductions.length }})
        </h4>
        <p v-if="!detailDeductions.length" class="text-sm text-gray-400">Jarima yo'q</p>
        <div v-else class="space-y-1">
          <div
            v-for="d in detailDeductions" :key="d.id"
            class="flex items-center justify-between py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/10"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ d.reason ?? '—' }}</span>
              <span
                v-if="d.auto_generated"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600"
              >auto</span>
            </div>
            <span class="text-sm font-mono font-medium text-red-500">-{{ formatMoney(Number(d.amount)) }}</span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <AppButton variant="ghost" @click="showDetail = false">Yopish</AppButton>
    </template>
  </AppModal>
</template>