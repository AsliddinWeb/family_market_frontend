<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Pencil, Save, X,
  User, Clock, DollarSign, Gift, BarChart2,
  Send, CheckCircle, XCircle,
} from 'lucide-vue-next'
import { useEmployeeStore } from '@/stores/employees'
import { useToastStore } from '@/stores/toast'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore }  from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { formatDate, formatMoney, formatMonth, formatDateTime } from '@/utils/format'
import type {
  AttendanceOut, SalaryRecordOut, BonusOut,
  DeductionOut, KPIOut, KPISummary, EmployeeUpdate,
  BranchOut, DepartmentOut, UserRole, EmploymentType,
} from '@/types'
import api from '@/composables/useApi'

const route   = useRoute()
const router  = useRouter()
const store   = useEmployeeStore()
const toast   = useToastStore()
const { can, canAny, isRole } = usePermission()
const auth = useAuthStore()

const id = Number(route.params.id)

// ── Tabs ──────────────────────────────────────────────
type Tab = 'general' | 'attendance' | 'salary' | 'bonus' | 'kpi'
const activeTab = ref<Tab>('general')

const allTabs: { key: Tab; label: string; icon: any; perm?: string }[] = [
  { key: 'general',    label: 'Umumiy',       icon: User       },
  { key: 'attendance', label: 'Davomat',       icon: Clock,      perm: 'attendance' },
  { key: 'salary',     label: 'Oylik tarixi',  icon: DollarSign, perm: 'salary'     },
  { key: 'bonus',      label: 'Bonus/Jarima',  icon: Gift,       perm: 'bonus'      },
  { key: 'kpi',        label: 'KPI',           icon: BarChart2,  perm: 'kpi'        },
]
// Tabs: general hammaga, boshqalari permission bo'yicha
const tabs = computed(() =>
  allTabs.filter(t => !t.perm || can.value(t.perm as any))
)

// ── Loading states ─────────────────────────────────────
const pageLoading = ref(true)
const saving      = ref(false)
const tabLoading  = ref(false)

// ── Tab data ───────────────────────────────────────────
const attendance = ref<AttendanceOut[]>([])
const salaries   = ref<SalaryRecordOut[]>([])
const bonuses    = ref<BonusOut[]>([])
const deductions = ref<DeductionOut[]>([])
const kpiList    = ref<KPIOut[]>([])
const kpiSummary = ref<KPISummary | null>(null)

// ── Edit mode ──────────────────────────────────────────
const editing = ref(false)
const form    = ref<EmployeeUpdate>({})

const branches    = ref<BranchOut[]>([])
const departments = ref<DepartmentOut[]>([])

const roles: { value: UserRole; label: string }[] = [
  { value: 'employee',       label: 'Xodim'         },
  { value: 'hr_manager',     label: 'HR Menejer'    },
  { value: 'branch_manager', label: 'Filial Menejer' },
  { value: 'accountant',     label: 'Buxgalter'     },
  { value: 'admin',          label: 'Admin'         },
]

// ✅ backend enum: 'full' | 'part' | 'contract'
const employmentTypes: { value: EmploymentType; label: string }[] = [
  { value: 'full',     label: "To'liq stavka" },
  { value: 'part',     label: 'Yarim stavka'  },
  { value: 'contract', label: 'Kontrakt'      },
]

function startEdit() {
  const e = store.selected
  if (!e) return
  form.value = {
    full_name:        e.full_name,
    role:             e.role,
    branch_id:        e.branch_id ?? undefined,
    department_id:    e.department_id ?? undefined,
    position:         e.position ?? '',
    employment_type:  e.employment_type,
    hire_date:        e.hire_date ?? '',
    // ✅ base_salary string keladi, Number() ga o'tkazamiz
    base_salary:      Number(e.base_salary),
    telegram_user_id: e.telegram_user_id ?? '',
    is_active:        e.is_active,
  }
  editing.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    const payload: EmployeeUpdate = { ...form.value }
    // ✅ bo'sh string fieldlarni o'chirish — backend null kutadi yoki umuman yubormaslik kerak
    if (!payload.hire_date)        delete payload.hire_date
    if (!payload.telegram_user_id) delete payload.telegram_user_id
    if (!payload.position)         delete payload.position
    await store.update(id, payload)
    toast.success('Xodim yangilandi')
    editing.value = false
  } catch {
    // interceptor allaqachon toast chiqaradi
  } finally {
    saving.value = false
  }
}

// ── Tab loaders ────────────────────────────────────────
const now   = new Date()
const year  = now.getFullYear()
const month = now.getMonth() + 1

async function loadTab(tab: Tab) {
  tabLoading.value = true
  try {
    if (tab === 'attendance') {
      const { data } = await api.get('/api/attendance', {
        params: { employee_id: id, size: 100, page: 1 },
      })
      attendance.value = data.items ?? []
    }
    if (tab === 'salary') {
      const { data } = await api.get('/api/salary', {
        params: { employee_id: id, size: 100, page: 1 },
      })
      salaries.value = data.items ?? []
    }
    if (tab === 'bonus') {
      const [b, d] = await Promise.allSettled([
        api.get('/api/bonuses',    { params: { employee_id: id, size: 100, page: 1 } }),
        api.get('/api/deductions', { params: { employee_id: id, size: 100, page: 1 } }),
      ])
      if (b.status === 'fulfilled') bonuses.value    = b.value.data.items ?? []
      if (d.status === 'fulfilled') deductions.value = d.value.data.items ?? []
    }
    if (tab === 'kpi') {
      const [k, s] = await Promise.allSettled([
        api.get('/api/kpi',         { params: { employee_id: id, year, month, size: 100, page: 1 } }),
        api.get('/api/kpi/summary', { params: { employee_id: id, year, month } }),
      ])
      if (k.status === 'fulfilled') kpiList.value    = k.value.data.items ?? []
      if (s.status === 'fulfilled') kpiSummary.value = s.value.data
    }
  } finally {
    tabLoading.value = false
  }
}

async function onTabChange(tab: Tab) {
  activeTab.value = tab
  if (tab !== 'general') await loadTab(tab)
}

// ── Init ───────────────────────────────────────────────
onMounted(async () => {
  try {
    await Promise.all([
      store.fetchOne(id),
      api.get('/api/branches',    { params: { size: 100, page: 1 } }).then(r => { branches.value    = r.data.items ?? [] }),
      api.get('/api/departments', { params: { size: 100, page: 1 } }).then(r => { departments.value = r.data.items ?? [] }),
    ])
  } catch {
    toast.error('Xodim topilmadi')
    router.push('/employees')
  } finally {
    pageLoading.value = false
  }
})

const employee = computed(() => store.selected)

const initials = computed(() => {
  const name = employee.value?.full_name ?? ''
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
})

const kpiPercent = computed(() => {
  if (!kpiSummary.value) return 0
  return Math.round(kpiSummary.value.percentage)
})
</script>

<template>
  <div class="space-y-5">

    <!-- Back -->
    <div class="flex items-center gap-3">
      <AppButton variant="ghost" size="sm" icon-only @click="router.push('/employees')">
        <component :is="ArrowLeft" class="w-4 h-4" />
      </AppButton>
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Xodim profili</h1>
    </div>

    <!-- Page loading -->
    <template v-if="pageLoading">
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          <div class="space-y-2">
            <div class="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            <div class="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="employee">

      <!-- Profile card -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div class="flex items-start justify-between flex-wrap gap-4">

          <!-- Avatar + info -->
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center shrink-0">
              <span class="text-primary-500 text-xl font-bold">{{ initials }}</span>
            </div>
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ employee.full_name }}</h2>
              <p class="text-sm text-gray-400 mt-0.5">{{ employee.phone }}</p>
              <div class="flex items-center gap-2 mt-2">
                <AppBadge :variant="employee.is_active ? 'active' : 'inactive'" size="sm" />
                <span class="text-xs text-gray-400">{{ employee.position ?? '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <template v-if="!editing">
              <AppButton v-if="can('employees')" variant="outline" size="sm" @click="startEdit">
                <component :is="Pencil" class="w-3.5 h-3.5" />
                Tahrirlash
              </AppButton>
            </template>
            <template v-else>
              <AppButton variant="ghost" size="sm" @click="editing = false">
                <component :is="X" class="w-3.5 h-3.5" />
                Bekor
              </AppButton>
              <AppButton variant="primary" size="sm" :loading="saving" @click="saveEdit">
                <component :is="Save" class="w-3.5 h-3.5" />
                Saqlash
              </AppButton>
            </template>
          </div>
        </div>

        <!-- Quick stats -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">Filial</p>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">{{ employee.branch?.name ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">Bo'lim</p>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">{{ employee.department?.name ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">Asosiy maosh</p>
            <!-- ✅ base_salary string, Number() ga o'tkazamiz -->
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">{{ formatMoney(Number(employee.base_salary)) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">Ishga kirgan</p>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">
              {{ employee.hire_date ? formatDate(employee.hire_date) : '—' }}
            </p>
          </div>
        </div>

        <!-- Telegram status -->
        <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <component :is="Send" class="w-4 h-4 text-gray-400" />
          <span class="text-sm text-gray-500 dark:text-gray-400">Telegram:</span>
          <template v-if="employee.telegram_user_id">
            <component :is="CheckCircle" class="w-4 h-4 text-green-500" />
            <span class="text-sm text-green-500 font-medium">Ulangan</span>
            <span class="text-xs text-gray-400 font-mono">{{ employee.telegram_user_id }}</span>
          </template>
          <template v-else>
            <component :is="XCircle" class="w-4 h-4 text-gray-400" />
            <span class="text-sm text-gray-400">Ulanmagan</span>
          </template>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

        <!-- Tab headers -->
        <div class="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="[
              'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            ]"
            @click="onTabChange(tab.key)"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab content -->
        <div class="p-5">

          <!-- Tab loading -->
          <div v-if="tabLoading" class="py-10 flex justify-center">
            <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>

          <!-- ── General tab ────────────────────────── -->
          <div v-else-if="activeTab === 'general'">

            <!-- View mode -->
            <template v-if="!editing">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div v-for="field in [
                  { label: 'To\'liq ism', value: employee.full_name },
                  { label: 'Telefon',     value: employee.phone },
                  { label: 'Rol',         value: employee.role },
                  { label: 'Ish turi',    value: employee.employment_type },
                  { label: 'Lavozim',     value: employee.position ?? '—' },
                  { label: 'Filial',      value: employee.branch?.name ?? '—' },
                  { label: 'Bo\'lim',     value: employee.department?.name ?? '—' },
                  { label: 'Maosh',       value: formatMoney(Number(employee.base_salary)) },
                ]" :key="field.label">
                  <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ field.label }}</p>
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ field.value }}</p>
                  </div>
                </div>
              </div>
            </template>

            <!-- Edit form -->
            <template v-else>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <AppInput v-model="form.full_name" label="To'liq ism" />
                <AppInput v-model="form.position"  label="Lavozim" />

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rol</label>
                  <select v-model="form.role"
                    class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500">
                    <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ish turi</label>
                  <!-- ✅ to'g'ri enum qiymatlari -->
                  <select v-model="form.employment_type"
                    class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500">
                    <option v-for="t in employmentTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Filial</label>
                  <select v-model="form.branch_id"
                    class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500">
                    <option :value="undefined">Tanlang</option>
                    <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bo'lim</label>
                  <select v-model="form.department_id"
                    class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500">
                    <option :value="undefined">Tanlang</option>
                    <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Asosiy maosh</label>
                  <!-- ✅ v-model.number — input string qaytaradi, number kerak -->
                  <input v-model.number="form.base_salary" type="number" min="0"
                    class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ishga kirgan sana</label>
                  <input v-model="form.hire_date" type="date"
                    class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
                  />
                </div>

                <AppInput v-model="form.telegram_user_id" label="Telegram ID" />

                <div class="flex items-center gap-3">
                  <input v-model="form.is_active" type="checkbox" id="is_active"
                    class="w-4 h-4 rounded text-primary-500" />
                  <label for="is_active" class="text-sm text-gray-700 dark:text-gray-300">Faol xodim</label>
                </div>

              </div>
            </template>
          </div>

          <!-- ── Attendance tab ──────────────────────── -->
          <div v-else-if="activeTab === 'attendance'">
            <div v-if="!attendance.length" class="text-center py-10 text-sm text-gray-400">Ma'lumot topilmadi</div>
            <div v-else class="space-y-2">
              <div
                v-for="a in attendance" :key="a.id"
                class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]"
              >
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ formatDate(a.date) }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    {{ a.check_in_time ? formatDateTime(a.check_in_time) : '—' }}
                    <template v-if="a.check_out_time"> → {{ formatDateTime(a.check_out_time) }}</template>
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span v-if="a.late_minutes > 0" class="text-xs text-amber-500">+{{ a.late_minutes }} min</span>
                  <AppBadge :variant="a.status" size="sm" />
                </div>
              </div>
            </div>
          </div>

          <!-- ── Salary tab ──────────────────────────── -->
          <div v-else-if="activeTab === 'salary'">
            <div v-if="!salaries.length" class="text-center py-10 text-sm text-gray-400">Ma'lumot topilmadi</div>
            <div v-else class="space-y-2">
              <div
                v-for="s in salaries" :key="s.id"
                class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]"
              >
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {{ formatMonth(s.period_year, s.period_month) }}
                  </p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    <!-- ✅ Decimal string → Number() -->
                    Asosiy: {{ formatMoney(Number(s.base_salary)) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ formatMoney(Number(s.net_salary)) }}</p>
                  <AppBadge :variant="s.status" size="sm" class="mt-1" />
                </div>
              </div>
            </div>
          </div>

          <!-- ── Bonus/Jarima tab ────────────────────── -->
          <div v-else-if="activeTab === 'bonus'">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

              <div>
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Bonuslar</h4>
                <div v-if="!bonuses.length"
                  class="text-center py-8 text-sm text-gray-400 bg-gray-50 dark:bg-[#232736] rounded-xl">
                  Bonus yo'q
                </div>
                <div v-else class="space-y-2">
                  <div v-for="b in bonuses" :key="b.id"
                    class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
                    <div>
                      <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ b.reason ?? b.bonus_type }}</p>
                      <p class="text-xs text-gray-400">{{ formatMonth(b.period_year, b.period_month) }}</p>
                    </div>
                    <!-- ✅ amount string → Number() -->
                    <span class="text-sm font-bold text-green-500">+{{ formatMoney(Number(b.amount)) }}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Jarimalar</h4>
                <div v-if="!deductions.length"
                  class="text-center py-8 text-sm text-gray-400 bg-gray-50 dark:bg-[#232736] rounded-xl">
                  Jarima yo'q
                </div>
                <div v-else class="space-y-2">
                  <div v-for="d in deductions" :key="d.id"
                    class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
                    <div>
                      <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ d.reason ?? d.deduction_type }}</p>
                      <p class="text-xs text-gray-400">{{ formatMonth(d.period_year, d.period_month) }}</p>
                    </div>
                    <!-- ✅ amount string → Number() -->
                    <span class="text-sm font-bold text-red-500">-{{ formatMoney(Number(d.amount)) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── KPI tab ─────────────────────────────── -->
          <div v-else-if="activeTab === 'kpi'">

            <div v-if="kpiSummary" class="mb-5 p-4 rounded-xl bg-gray-50 dark:bg-[#232736]">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ formatMonth(year, month) }} — Umumiy ball
                </span>
                <span class="text-sm font-bold text-primary-500">{{ kpiPercent }}%</span>
              </div>
              <div class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="kpiPercent >= 80 ? 'bg-green-500' : kpiPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'"
                  :style="`width: ${kpiPercent}%`"
                />
              </div>
              <p class="text-xs text-gray-400 mt-1">
                {{ kpiSummary.total_score }} / {{ kpiSummary.max_score }} ball
              </p>
            </div>

            <div v-if="!kpiList.length" class="text-center py-10 text-sm text-gray-400">KPI ma'lumoti topilmadi</div>
            <div v-else class="space-y-2">
              <div v-for="k in kpiList" :key="k.id" class="p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ k.metric_name }}</p>
                  <!-- ✅ score string → Number() -->
                  <span class="text-xs font-bold text-primary-500">{{ Number(k.score).toFixed(1) }} ball</span>
                </div>
                <div class="flex items-center gap-4 text-xs text-gray-400">
                  <span>Maqsad: {{ k.target_value }}</span>
                  <span>Haqiqiy: {{ k.actual_value }}</span>
                  <span>Og'irlik: {{ k.weight }}</span>
                </div>
                <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-2 overflow-hidden">
                  <div
                    class="h-full bg-primary-500 rounded-full transition-all"
                    :style="`width: ${Math.min((Number(k.actual_value) / Number(k.target_value)) * 100, 100)}%`"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>

  </div>
</template>