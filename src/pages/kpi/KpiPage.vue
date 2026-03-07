<script setup lang="ts">
/**
 * KpiPage.vue
 * Ruxsatlar:
 *   superadmin / admin   → barcha xodim KPI: ko'rish, qo'shish, tahrirlash, o'chirish
 *   hr_manager           → barcha xodim KPI: ko'rish, qo'shish, tahrirlash, o'chirish
 *   branch_manager       → faqat ko'rish
 *   employee             → faqat o'z KPI ni ko'rish (router: kpi.own)
 *   accountant           → kirish yo'q
 */
import { ref, computed, onMounted } from 'vue'
import {
  Plus, RefreshCw, Pencil, Trash2, Filter,
  Target, CheckCircle2, AlertCircle, BarChart3,
} from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppInput from '@/components/ui/AppInput.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import api from '@/composables/useApi'
import { formatMonth, currentYearMonth } from '@/utils/format'
import type { KPIOut, KPICreate, KPIUpdate, KPISummary, EmployeeOut } from '@/types'

const toast       = useToastStore()
const { confirm } = useConfirm()
const { can, isRole } = usePermission()
const auth        = useAuthStore()

// ── Role ruxsatlari ───────────────────────────────────────────────────────────
const isEmployee = computed(() => isRole.value('employee'))
const canWrite   = computed(() => can.value('kpi') && !isRole.value('branch_manager'))
// employee faqat o'z kpiini ko'radi — backend ham shu employee_id ni o'rnatib qo'yadi

// ── Period ────────────────────────────────────────────────────────────────────
const { year: initYear, month: initMonth } = currentYearMonth()
const filterYear  = ref(initYear)
const filterMonth = ref(initMonth)
const filterEmpId = ref<number | undefined>(undefined)
const years  = Array.from({ length: 5 }, (_, i) => initYear - 2 + i)
const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']

// ── KPIs ──────────────────────────────────────────────────────────────────────
const kpis       = ref<KPIOut[]>([])
const totalCount = ref(0)
const page       = ref(1)
const loading    = ref(false)
const totalPages = computed(() => Math.ceil(totalCount.value / 20))

const stats = computed(() => {
  const all = kpis.value
  const avgScore = all.length ? all.reduce((s, k) => s + k.score, 0) / all.length : 0
  const achieved = all.filter(k => k.target_value > 0 && k.actual_value >= k.target_value).length
  return { count: all.length, avgScore: Math.round(avgScore), achieved }
})

async function fetchKpis() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, size: 20, year: filterYear.value, month: filterMonth.value }
    if (filterEmpId.value) params.employee_id = filterEmpId.value
    const { data } = await api.get('/api/kpi', { params })
    kpis.value    = data.items ?? []
    totalCount.value = data.total ?? 0
  } finally { loading.value = false }
}

function applyFilter() { page.value = 1; fetchKpis() }
function changePage(p: number) { page.value = p; fetchKpis() }
onMounted(fetchKpis)

// ── Employees (manager uchun filter) ─────────────────────────────────────────
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

// ── Summary (o'z hisob) ───────────────────────────────────────────────────────
const summary        = ref<KPISummary | null>(null)
const summaryLoading = ref(false)

async function fetchSummary(empId: number) {
  summaryLoading.value = true
  try {
    const { data } = await api.get('/api/kpi/summary', {
      params: { employee_id: empId, year: filterYear.value, month: filterMonth.value }
    })
    summary.value = data
  } catch { summary.value = null }
  finally { summaryLoading.value = false }
}

// ── Create/Edit modal ─────────────────────────────────────────────────────────
const showModal  = ref(false)
const editingKpi = ref<KPIOut | null>(null)
const saving     = ref(false)
const form = ref<KPICreate & { id?: number }>({
  employee_id: 0, metric_name: '', target_value: 0, actual_value: 0, weight: 100,
  period_year: initYear, period_month: initMonth,
})
const errors = ref<Record<string, string>>({})

async function openCreate() {
  await fetchEmployees()
  editingKpi.value = null
  form.value = { employee_id: 0, metric_name: '', target_value: 0, actual_value: 0, weight: 100, period_year: filterYear.value, period_month: filterMonth.value }
  errors.value = {}
  showModal.value = true
}

async function openEdit(kpi: KPIOut) {
  await fetchEmployees()
  editingKpi.value = kpi
  form.value = {
    id: kpi.id,
    employee_id: kpi.employee_id,
    metric_name: kpi.metric_name,
    target_value: kpi.target_value,
    actual_value: kpi.actual_value,
    weight: kpi.weight,
    period_year: kpi.period_year,
    period_month: kpi.period_month,
  }
  errors.value = {}
  showModal.value = true
}

function validateForm() {
  const e: Record<string, string> = {}
  if (!form.value.employee_id)                                    e.employee_id   = 'Xodim tanlang'
  if (!form.value.metric_name?.trim())                            e.metric_name   = 'Metrika nomi kiritilmagan'
  if (!form.value.target_value || form.value.target_value <= 0)  e.target_value  = 'Maqsad qiymati 0 dan katta bo\'lsin'
  if ((form.value.weight ?? 0) <= 0 || (form.value.weight ?? 0) > 100) e.weight = 'Og\'irlik 1–100 oralig\'ida bo\'lsin'
  errors.value = e
  return !Object.keys(e).length
}

async function saveKpi() {
  if (!validateForm()) return
  saving.value = true
  try {
    if (editingKpi.value) {
      const update: KPIUpdate = { actual_value: form.value.actual_value, target_value: form.value.target_value, weight: form.value.weight }
      await api.patch(`/api/kpi/${editingKpi.value.id}`, update)
      toast.success('KPI yangilandi')
    } else {
      await api.post('/api/kpi', { ...form.value })
      toast.success('KPI qo\'shildi')
    }
    showModal.value = false; fetchKpis()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally { saving.value = false }
}

async function deleteKpi(kpi: KPIOut) {
  const ok = await confirm({ title: 'KPI o\'chirish', message: `"${kpi.metric_name}" KPIni o'chirmoqchimisiz?`, type: 'danger' })
  if (!ok) return
  try { await api.delete(`/api/kpi/${kpi.id}`); toast.success('O\'chirildi'); fetchKpis() }
  catch { toast.error('O\'chirishda xato') }
}

// ── Score rang ────────────────────────────────────────────────────────────────
function scoreColor(kpi: KPIOut) {
  if (!kpi.target_value) return 'text-gray-400'
  const pct = (kpi.actual_value / kpi.target_value) * 100
  if (pct >= 100) return 'text-green-600'
  if (pct >= 70)  return 'text-amber-500'
  return 'text-red-500'
}

function progressPct(kpi: KPIOut) {
  if (!kpi.target_value) return 0
  return Math.min(100, Math.round((kpi.actual_value / kpi.target_value) * 100))
}

// ── Table columns ─────────────────────────────────────────────────────────────
const columns = [
  ...(isEmployee.value ? [] : [{ key: 'employee', label: 'Xodim', mobileTitle: true }]),
  { key: 'metric',    label: 'Metrika',   ...(isEmployee.value ? { mobileTitle: true } : {}) },
  { key: 'progress',  label: 'Progress' },
  { key: 'score',     label: 'Ball' },
  { key: 'weight',    label: 'Og\'irlik', responsive: 'md' },
  ...(canWrite.value ? [{ key: 'actions', label: '', align: 'right' as const }] : []),
]
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">KPI</h1>
        <p class="text-sm text-gray-400 mt-0.5">
          <template v-if="isEmployee">Mening ko'rsatkichlarim</template>
          <template v-else>Xodimlar ishlash ko'rsatkichlari</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <AppButton variant="ghost" size="sm" :loading="loading" @click="fetchKpis">
          <component :is="RefreshCw" class="w-4 h-4" />
        </AppButton>
        <AppButton v-if="canWrite" variant="primary" @click="openCreate">
          <component :is="Plus" class="w-4 h-4" />
          <span class="hidden sm:inline">KPI qo'shish</span>
        </AppButton>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4">
      <StatCard :icon="Target"       label="Jami KPI"      :value="stats.count"         color="indigo" />
      <StatCard :icon="CheckCircle2" label="Maqsadga yetdi" :value="stats.achieved"     color="green"  />
      <StatCard :icon="BarChart3"    label="O'rtacha ball"  :value="stats.avgScore + '%'" color="blue"  />
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
        <!-- Xodim filtri — faqat managerlar uchun -->
        <div v-if="!isEmployee">
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Xodim</label>
          <select v-model.number="filterEmpId" @focus="fetchEmployees"
            class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
            <option :value="undefined">Barchasi</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.full_name }}</option>
          </select>
        </div>
        <AppButton variant="primary" size="sm" @click="applyFilter">
          <component :is="Filter" class="w-3.5 h-3.5" />
          Ko'rsatish
        </AppButton>
      </div>
      <p class="text-xs text-gray-400 mt-2">{{ formatMonth(filterYear, filterMonth) }} — {{ totalCount }} ta KPI</p>
    </div>

    <!-- KPI table -->
    <AppTable :columns="columns" :rows="kpis" :loading="loading" empty-text="Bu davr uchun KPI topilmadi">

      <!-- Xodim (manager uchun) -->
      <template #cell-employee="{ row }">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ row.employee?.full_name ?? empName(row.employee_id) }}
        </span>
      </template>

      <!-- Metrika nomi -->
      <template #cell-metric="{ row }">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ row.metric_name }}</p>
          <p class="text-xs text-gray-400">{{ formatMonth(row.period_year, row.period_month) }}</p>
        </div>
      </template>

      <!-- Progress bar -->
      <template #cell-progress="{ row }">
        <div class="w-32">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-gray-500">{{ row.actual_value }} / {{ row.target_value }}</span>
            <span :class="['text-xs font-medium', scoreColor(row)]">{{ progressPct(row) }}%</span>
          </div>
          <div class="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all', progressPct(row) >= 100 ? 'bg-green-500' : progressPct(row) >= 70 ? 'bg-amber-400' : 'bg-red-400']"
              :style="{ width: `${progressPct(row)}%` }"
            />
          </div>
        </div>
      </template>

      <!-- Ball -->
      <template #cell-score="{ row }">
        <span :class="['text-sm font-bold font-mono', scoreColor(row)]">{{ row.score }}</span>
      </template>

      <!-- Og'irlik -->
      <template #cell-weight="{ row }">
        <span class="text-sm text-gray-500">{{ row.weight }}%</span>
      </template>

      <!-- Actions -->
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500 transition-colors" @click="openEdit(row)" title="Tahrirlash">
            <component :is="Pencil" class="w-3.5 h-3.5" />
          </button>
          <button class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" @click="deleteKpi(row)" title="O'chirish">
            <component :is="Trash2" class="w-3.5 h-3.5" />
          </button>
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

  <!-- Create / Edit Modal -->
  <AppModal
    v-model="showModal"
    :title="editingKpi ? 'KPI tahrirlash' : 'KPI qo\'shish'"
    size="md"
  >
    <div class="space-y-4">
      <!-- Xodim (faqat create, edit da o'zgarmaydi) -->
      <div v-if="!editingKpi">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Xodim</label>
        <div v-if="empLoading" class="h-10"><SkeletonLoader variant="text" /></div>
        <select v-else v-model.number="form.employee_id"
          :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500', errors.employee_id ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']">
          <option :value="0" disabled>Xodim tanlang...</option>
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.full_name }}</option>
        </select>
        <p v-if="errors.employee_id" class="text-xs text-red-500 mt-1">{{ errors.employee_id }}</p>
      </div>
      <div v-else class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
        <p class="text-xs text-gray-400">Xodim</p>
        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
          {{ editingKpi.employee?.full_name ?? empName(editingKpi.employee_id) }}
        </p>
      </div>

      <!-- Metrika nomi (faqat create da o'zgartirish mumkin) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metrika nomi</label>
        <AppInput
          v-model="form.metric_name"
          placeholder="Masalan: Sotuv hajmi, Mijoz qoniqishi..."
          :state="errors.metric_name ? 'error' : 'default'"
          :hint="errors.metric_name"
          :disabled="!!editingKpi"
        />
      </div>

      <!-- Target -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maqsad qiymati</label>
        <AppInput
          v-model.number="form.target_value"
          type="number"
          placeholder="100"
          :state="errors.target_value ? 'error' : 'default'"
          :hint="errors.target_value"
        />
      </div>

      <!-- Actual -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Haqiqiy qiymat</label>
        <AppInput v-model.number="form.actual_value" type="number" placeholder="0" />
        <!-- Mini progress preview -->
        <div v-if="form.target_value > 0" class="mt-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-gray-400">Progress</span>
            <span class="text-xs font-medium text-primary-500">{{ form.target_value > 0 ? Math.min(100, Math.round(((form.actual_value ?? 0) / form.target_value) * 100)) : 0 }}%</span>
          </div>
          <div class="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-primary-500 rounded-full transition-all"
              :style="{ width: `${form.target_value > 0 ? Math.min(100, Math.round(((form.actual_value ?? 0) / form.target_value) * 100)) : 0}%` }" />
          </div>
        </div>
      </div>

      <!-- Weight -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Og'irlik (1–100%)</label>
        <AppInput
          v-model.number="form.weight"
          type="number"
          placeholder="100"
          :state="errors.weight ? 'error' : 'default'"
          :hint="errors.weight"
          :disabled="!!editingKpi"
        />
      </div>

      <!-- Period (faqat create) -->
      <div v-if="!editingKpi" class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yil</label>
          <select v-model.number="form.period_year" class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oy</label>
          <select v-model.number="form.period_month" class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
      </div>
    </div>
    <template #footer>
      <AppButton variant="ghost" @click="showModal = false">Bekor qilish</AppButton>
      <AppButton variant="primary" :loading="saving" @click="saveKpi">
        <component :is="editingKpi ? Pencil : Plus" class="w-4 h-4" />
        {{ editingKpi ? 'Saqlash' : 'Qo\'shish' }}
      </AppButton>
    </template>
  </AppModal>
</template>