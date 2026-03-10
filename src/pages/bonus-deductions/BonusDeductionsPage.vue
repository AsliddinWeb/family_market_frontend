<script setup lang="ts">
/**
 * BonusDeductionsPage.vue
 * Ruxsatlar:
 *   superadmin / admin  → ko'rish + qo'shish + o'chirish
 *   hr_manager          → ko'rish + qo'shish + o'chirish
 *   accountant          → faqat ko'rish
 */
import { ref, computed, onMounted } from 'vue'
import { Plus, RefreshCw, Trash2, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import { usePermission } from '@/composables/usePermission'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppInput from '@/components/ui/AppInput.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import api from '@/composables/useApi'
import { formatMoney, formatMonth, currentYearMonth } from '@/utils/format'
import type { BonusOut, DeductionOut, EmployeeOut, BonusCreate, DeductionCreate } from '@/types'

const toast       = useToastStore()
const { confirm } = useConfirm()
const { can, isRole } = usePermission()

// accountant faqat ko'radi
const canWrite = computed(() => can.value('bonus') && !isRole.value('accountant'))

// ── Period & tab ──────────────────────────────────────────────────────────────
const { year: initYear, month: initMonth } = currentYearMonth()
const filterYear  = ref(initYear)
const filterMonth = ref(initMonth)
const activeTab   = ref<'bonus' | 'deduction'>('bonus')
const years  = Array.from({ length: 5 }, (_, i) => initYear - 2 + i)
const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']

// ── Bonuses ───────────────────────────────────────────────────────────────────
const bonuses      = ref<BonusOut[]>([])
const bonusTotal   = ref(0)
const bonusPage    = ref(1)
const bonusLoading = ref(false)
const bonusPages   = computed(() => Math.ceil(bonusTotal.value / 20))

async function fetchBonuses() {
  bonusLoading.value = true
  try {
    const { data } = await api.get('/api/bonuses', {
      params: { year: filterYear.value, month: filterMonth.value, page: bonusPage.value, size: 20 }
    })
    bonuses.value    = data.items ?? []
    bonusTotal.value = data.total  ?? 0
  } finally { bonusLoading.value = false }
}

// ── Deductions ────────────────────────────────────────────────────────────────
const deductions       = ref<DeductionOut[]>([])
const deductionTotal   = ref(0)
const deductionPage    = ref(1)
const deductionLoading = ref(false)
const deductionPages   = computed(() => Math.ceil(deductionTotal.value / 20))

async function fetchDeductions() {
  deductionLoading.value = true
  try {
    const { data } = await api.get('/api/deductions', {
      params: { year: filterYear.value, month: filterMonth.value, page: deductionPage.value, size: 20 }
    })
    deductions.value    = data.items ?? []
    deductionTotal.value = data.total ?? 0
  } finally { deductionLoading.value = false }
}

function applyFilter() {
  bonusPage.value = 1; deductionPage.value = 1
  fetchBonuses(); fetchDeductions()
}
onMounted(() => { fetchBonuses(); fetchDeductions() })

// ── Summary ───────────────────────────────────────────────────────────────────
const bonusSum     = computed(() => bonuses.value.reduce((s, b) => s + Number(b.amount), 0))
const deductionSum = computed(() => deductions.value.reduce((s, d) => s + Number(d.amount), 0))
const net          = computed(() => bonusSum.value - deductionSum.value)

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

// ── Bonus modal ───────────────────────────────────────────────────────────────
const showBonusModal = ref(false)
const bonusForm      = ref<BonusCreate>({ employee_id: 0, amount: 0, reason: '', bonus_type: 'other', period_year: initYear, period_month: initMonth })
const bonusErrors    = ref<Record<string, string>>({})
const bonusSaving    = ref(false)

async function openBonusModal() {
  await fetchEmployees()
  bonusForm.value   = { employee_id: 0, amount: 0, reason: '', bonus_type: 'other', period_year: filterYear.value, period_month: filterMonth.value }
  bonusErrors.value = {}
  showBonusModal.value = true
}

function validateBonus() {
  const e: Record<string, string> = {}
  if (!bonusForm.value.employee_id)                           e.employee_id = 'Xodim tanlang'
  if (!bonusForm.value.amount || bonusForm.value.amount <= 0) e.amount      = 'Summa 0 dan katta bo\'lsin'
  if (!bonusForm.value.reason?.trim())                        e.reason      = 'Sabab kiritilmagan'
  bonusErrors.value = e
  return !Object.keys(e).length
}

async function saveBonus() {
  if (!validateBonus()) return
  bonusSaving.value = true
  try {
    await api.post('/api/bonuses', bonusForm.value)
    toast.success('Bonus qo\'shildi'); showBonusModal.value = false; fetchBonuses()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally { bonusSaving.value = false }
}

async function deleteBonus(b: BonusOut) {
  const ok = await confirm({ title: 'Bonusni o\'chirish', message: `"${b.reason}" bonusini o'chirmoqchimisiz?`, type: 'danger' })
  if (!ok) return
  try { await api.delete(`/api/bonuses/${b.id}`); toast.success('O\'chirildi'); fetchBonuses() }
  catch { toast.error('O\'chirishda xato') }
}

// ── Deduction modal ───────────────────────────────────────────────────────────
const showDeductionModal = ref(false)
const deductionForm      = ref<DeductionCreate>({ employee_id: 0, amount: 0, reason: '', deduction_type: 'other', period_year: initYear, period_month: initMonth })
const deductionErrors    = ref<Record<string, string>>({})
const deductionSaving    = ref(false)

async function openDeductionModal() {
  await fetchEmployees()
  deductionForm.value   = { employee_id: 0, amount: 0, reason: '', deduction_type: 'other', period_year: filterYear.value, period_month: filterMonth.value }
  deductionErrors.value = {}
  showDeductionModal.value = true
}

function validateDeduction() {
  const e: Record<string, string> = {}
  if (!deductionForm.value.employee_id)                              e.employee_id = 'Xodim tanlang'
  if (!deductionForm.value.amount || deductionForm.value.amount <= 0) e.amount    = 'Summa 0 dan katta bo\'lsin'
  if (!deductionForm.value.reason?.trim())                            e.reason    = 'Sabab kiritilmagan'
  deductionErrors.value = e
  return !Object.keys(e).length
}

async function saveDeduction() {
  if (!validateDeduction()) return
  deductionSaving.value = true
  try {
    await api.post('/api/deductions', deductionForm.value)
    toast.success('Jarima qo\'shildi'); showDeductionModal.value = false; fetchDeductions()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally { deductionSaving.value = false }
}

async function deleteDeduction(d: DeductionOut) {
  const ok = await confirm({ title: 'Jarimani o\'chirish', message: `"${d.reason}" jarimani o'chirmoqchimisiz?`, type: 'danger' })
  if (!ok) return
  try { await api.delete(`/api/deductions/${d.id}`); toast.success('O\'chirildi'); fetchDeductions() }
  catch { toast.error('O\'chirishda xato') }
}

// ── Labels ────────────────────────────────────────────────────────────────────
const BONUS_TYPE_LABELS: Record<string, string>     = { performance: 'Natija', holiday: 'Bayram', project: 'Loyiha', other: 'Boshqa' }
const DEDUCTION_TYPE_LABELS: Record<string, string> = { late: 'Kechikish', absent: 'Yo\'qlik', damage: 'Zarar', advance: 'Avans', other: 'Boshqa' }

const bonusCols = [
  { key: 'employee', label: 'Xodim',   mobileTitle: true },
  { key: 'type',     label: 'Turi',    responsive: 'md' },
  { key: 'reason',   label: 'Sabab',   responsive: 'lg' },
  { key: 'amount',   label: 'Summa' },
  { key: 'auto',     label: '',        responsive: 'md' },
  { key: 'actions',  label: '',        align: 'right' as const },
]
const deductionCols = [
  { key: 'employee', label: 'Xodim',   mobileTitle: true },
  { key: 'type',     label: 'Turi',    responsive: 'md' },
  { key: 'reason',   label: 'Sabab',   responsive: 'lg' },
  { key: 'amount',   label: 'Summa' },
  { key: 'auto',     label: '' },
  { key: 'actions',  label: '',        align: 'right' as const },
]
</script>

<template>
  <div>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Bonus / Jarima</h1>
        <p class="text-sm text-gray-400 mt-0.5">Mukofotlar va jarimalar boshqaruvi</p>
      </div>
      <div class="flex items-center gap-2">
        <AppButton variant="ghost" size="sm" :loading="bonusLoading || deductionLoading" @click="applyFilter">
          <component :is="RefreshCw" class="w-4 h-4" />
        </AppButton>
        <template v-if="canWrite">
          <AppButton v-if="activeTab === 'bonus'" variant="primary" @click="openBonusModal">
            <component :is="Plus" class="w-4 h-4" />
            <span class="hidden sm:inline">Bonus qo'shish</span>
          </AppButton>
          <AppButton v-else variant="danger" @click="openDeductionModal">
            <component :is="Plus" class="w-4 h-4" />
            <span class="hidden sm:inline">Jarima qo'shish</span>
          </AppButton>
        </template>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4">
      <StatCard :icon="TrendingUp"   label="Jami bonus"  :value="formatMoney(bonusSum)"      color="green" />
      <StatCard :icon="TrendingDown" label="Jami jarima" :value="formatMoney(deductionSum)"  color="red"   />
      <StatCard :icon="Minus"        label="Sof ta'sir"  :value="formatMoney(Math.abs(net))" :color="net >= 0 ? 'green' : 'red'" />
    </div>

    <!-- Filter -->
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
        <AppButton variant="primary" size="sm" @click="applyFilter">
          <component :is="Filter" class="w-3.5 h-3.5" />
          Ko'rsatish
        </AppButton>
      </div>
      <p class="text-xs text-gray-400 mt-2">{{ formatMonth(filterYear, filterMonth) }}</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
      <button v-for="tab in [{ key: 'bonus', label: `Bonuslar (${bonusTotal})` }, { key: 'deduction', label: `Jarimalar (${deductionTotal})` }]" :key="tab.key"
        :class="['px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === tab.key ? 'bg-white dark:bg-[#1a1d27] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300']"
        @click="activeTab = tab.key as 'bonus' | 'deduction'">
        {{ tab.label }}
      </button>
    </div>

    <!-- Bonus table -->
    <AppTable v-if="activeTab === 'bonus'" :columns="bonusCols" :rows="bonuses" :loading="bonusLoading" empty-text="Bu davr uchun bonus topilmadi">
      <template #cell-employee="{ row }">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ row.employee?.full_name ?? empName(row.employee_id) }}</span>
      </template>
      <template #cell-type="{ row }">
        <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700">{{ BONUS_TYPE_LABELS[row.bonus_type] ?? row.bonus_type }}</span>
      </template>
      <template #cell-reason="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ row.reason ?? '—' }}</span>
      </template>
      <template #cell-amount="{ row }">
        <span class="text-sm font-bold font-mono text-green-600">+{{ formatMoney(Number(row.amount)) }}</span>
      </template>
      <template #cell-auto="{ row }">
        <span v-if="row.auto_generated" class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">auto</span>
      </template>
      <template #cell-actions="{ row }">
        <button v-if="canWrite && !row.auto_generated"
          class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
          @click="deleteBonus(row)">
          <component :is="Trash2" class="w-3.5 h-3.5" />
        </button>
      </template>
    </AppTable>

    <!-- Deduction table -->
    <AppTable v-if="activeTab === 'deduction'" :columns="deductionCols" :rows="deductions" :loading="deductionLoading" empty-text="Bu davr uchun jarima topilmadi">
      <template #cell-employee="{ row }">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ row.employee?.full_name ?? empName(row.employee_id) }}</span>
      </template>
      <template #cell-type="{ row }">
        <span class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">{{ DEDUCTION_TYPE_LABELS[row.deduction_type] ?? row.deduction_type }}</span>
      </template>
      <template #cell-reason="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ row.reason ?? '—' }}</span>
      </template>
      <template #cell-amount="{ row }">
        <span class="text-sm font-bold font-mono text-red-500">-{{ formatMoney(Number(row.amount)) }}</span>
      </template>
      <template #cell-auto="{ row }">
        <span v-if="row.auto_generated" class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">auto</span>
      </template>
      <template #cell-actions="{ row }">
        <button v-if="canWrite && !row.auto_generated"
          class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
          @click="deleteDeduction(row)">
          <component :is="Trash2" class="w-3.5 h-3.5" />
        </button>
      </template>
    </AppTable>

    <!-- Pagination bonus -->
    <div v-if="activeTab === 'bonus' && bonusPages > 1" class="flex items-center justify-center gap-2">
      <AppButton variant="ghost" size="sm" :disabled="bonusPage === 1" @click="bonusPage--; fetchBonuses()">←</AppButton>
      <span class="text-sm text-gray-500">{{ bonusPage }} / {{ bonusPages }}</span>
      <AppButton variant="ghost" size="sm" :disabled="bonusPage === bonusPages" @click="bonusPage++; fetchBonuses()">→</AppButton>
    </div>
    <!-- Pagination deduction -->
    <div v-if="activeTab === 'deduction' && deductionPages > 1" class="flex items-center justify-center gap-2">
      <AppButton variant="ghost" size="sm" :disabled="deductionPage === 1" @click="deductionPage--; fetchDeductions()">←</AppButton>
      <span class="text-sm text-gray-500">{{ deductionPage }} / {{ deductionPages }}</span>
      <AppButton variant="ghost" size="sm" :disabled="deductionPage === deductionPages" @click="deductionPage++; fetchDeductions()">→</AppButton>
    </div>
  </div>

  <!-- Bonus Modal -->
  <AppModal v-model="showBonusModal" title="Bonus qo'shish" size="md">
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Xodim</label>
        <div v-if="empLoading" class="h-10"><SkeletonLoader variant="text" /></div>
        <select v-else v-model.number="bonusForm.employee_id"
          :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500', bonusErrors.employee_id ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']">
          <option :value="0" disabled>Xodim tanlang...</option>
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.full_name }}</option>
        </select>
        <p v-if="bonusErrors.employee_id" class="text-xs text-red-500 mt-1">{{ bonusErrors.employee_id }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turi</label>
        <select v-model="bonusForm.bonus_type" class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
          <option value="performance">Natija (performance)</option>
          <option value="holiday">Bayram (holiday)</option>
          <option value="project">Loyiha (project)</option>
          <option value="other">Boshqa (other)</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summa (so'm)</label>
        <AppInput v-model.number="bonusForm.amount" type="number" placeholder="100000" :state="bonusErrors.amount ? 'error' : 'default'" :hint="bonusErrors.amount" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sabab</label>
        <AppInput v-model="bonusForm.reason" placeholder="Bonus sababi..." :state="bonusErrors.reason ? 'error' : 'default'" :hint="bonusErrors.reason" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yil</label>
          <select v-model.number="bonusForm.period_year" class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oy</label>
          <select v-model.number="bonusForm.period_month" class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
      </div>
    </div>
    <template #footer>
      <AppButton variant="ghost" @click="showBonusModal = false">Bekor qilish</AppButton>
      <AppButton variant="primary" :loading="bonusSaving" @click="saveBonus">
        <component :is="Plus" class="w-4 h-4" />Qo'shish
      </AppButton>
    </template>
  </AppModal>

  <!-- Deduction Modal -->
  <AppModal v-model="showDeductionModal" title="Jarima qo'shish" size="md">
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Xodim</label>
        <div v-if="empLoading" class="h-10"><SkeletonLoader variant="text" /></div>
        <select v-else v-model.number="deductionForm.employee_id"
          :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500', deductionErrors.employee_id ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']">
          <option :value="0" disabled>Xodim tanlang...</option>
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.full_name }}</option>
        </select>
        <p v-if="deductionErrors.employee_id" class="text-xs text-red-500 mt-1">{{ deductionErrors.employee_id }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turi</label>
        <select v-model="deductionForm.deduction_type" class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
          <option value="late">Kechikish (late)</option>
          <option value="absent">Yo'qlik (absent)</option>
          <option value="damage">Zarar (damage)</option>
          <option value="advance">Avans (advance)</option>
          <option value="other">Boshqa (other)</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summa (so'm)</label>
        <AppInput v-model.number="deductionForm.amount" type="number" placeholder="50000" :state="deductionErrors.amount ? 'error' : 'default'" :hint="deductionErrors.amount" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sabab</label>
        <AppInput v-model="deductionForm.reason" placeholder="Jarima sababi..." :state="deductionErrors.reason ? 'error' : 'default'" :hint="deductionErrors.reason" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yil</label>
          <select v-model.number="deductionForm.period_year" class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oy</label>
          <select v-model.number="deductionForm.period_month" class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
      </div>
    </div>
    <template #footer>
      <AppButton variant="ghost" @click="showDeductionModal = false">Bekor qilish</AppButton>
      <AppButton variant="danger" :loading="deductionSaving" @click="saveDeduction">
        <component :is="Plus" class="w-4 h-4" />Qo'shish
      </AppButton>
    </template>
  </AppModal>
  </div>
</template>