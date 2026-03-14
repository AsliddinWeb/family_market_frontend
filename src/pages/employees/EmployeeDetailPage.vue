<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, User, Clock, DollarSign, Gift, BarChart2, Camera } from 'lucide-vue-next'
import { useEmployeeStore } from '@/stores/employees'
import { useToastStore } from '@/stores/toast'
import { usePermission } from '@/composables/usePermission'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatDate, formatMoney } from '@/utils/format'
import type { EmployeeUpdate, BranchOut, DepartmentOut } from '@/types'
import { ALL_WEEK_DAYS, WEEK_DAY_LABELS } from '@/types'
import api from '@/composables/useApi'

import GeneralTab    from './tabs/GeneralTab.vue'
import AttendanceTab from './tabs/AttendanceTab.vue'
import SalaryTab     from './tabs/SalaryTab.vue'
import BonusTab      from './tabs/BonusTab.vue'
import KpiTab        from './tabs/KpiTab.vue'

const route   = useRoute()
const router  = useRouter()
const store   = useEmployeeStore()
const toast   = useToastStore()
const { can } = usePermission()

const id = Number(route.params.id)

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type Tab = 'general' | 'attendance' | 'salary' | 'bonus' | 'kpi'
const activeTab = ref<Tab>('general')

const allTabs: { key: Tab; label: string; icon: any; perm?: string }[] = [
  { key: 'general',    label: 'Umumiy',      icon: User                           },
  { key: 'attendance', label: 'Davomat',      icon: Clock,      perm: 'attendance' },
  { key: 'salary',     label: 'Oylik tarixi', icon: DollarSign, perm: 'salary'     },
  { key: 'bonus',      label: 'Bonus/Jarima', icon: Gift,       perm: 'bonus'      },
  { key: 'kpi',        label: 'KPI',          icon: BarChart2,  perm: 'kpi'        },
]
const tabs = computed(() => allTabs.filter(t => !t.perm || can.value(t.perm as any)))

const pageLoading  = ref(true)
const saving       = ref(false)
const uploading    = ref(false)
const branches     = ref<BranchOut[]>([])
const departments  = ref<DepartmentOut[]>([])
const photoInput   = ref<HTMLInputElement | null>(null)

async function onSave(payload: EmployeeUpdate) {
  saving.value = true
  try {
    await store.update(id, payload)
    toast.success('Xodim yangilandi')
  } catch {
    //
  } finally {
    saving.value = false
  }
}

async function uploadPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    await api.post(`/api/employees/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    await store.fetchOne(id)
    toast.success('Rasm yuklandi')
  } catch {
    toast.error('Rasm yuklashda xato')
  } finally {
    uploading.value = false
    if (photoInput.value) photoInput.value.value = ''
  }
}

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
const photoUrl = computed(() => {
  const p = employee.value?.photo
  if (!p) return null
  return p.startsWith('http') ? p : `${BASE_URL}/media/${p}`
})
const effectiveHourlyRate = computed(() => {
  const e = employee.value
  if (!e) return 0
  if (e.hourly_rate) return Number(e.hourly_rate)
  return Number(e.base_salary) / ((e.work_hours_per_day ?? 8) * 22)
})
</script>

<template>
  <div class="space-y-5">

    <!-- Back -->
    <div class="flex items-center gap-3">
      <button
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="router.push('/employees')"
      >
        <component :is="ArrowLeft" class="w-5 h-5 text-gray-500" />
      </button>
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Xodim profili</h1>
    </div>

    <!-- Skeleton -->
    <template v-if="pageLoading">
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-700" />
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
        <div class="flex items-start gap-5">

          <!-- Avatar -->
          <div class="relative shrink-0 group">
            <div class="w-20 h-20 rounded-2xl overflow-hidden bg-primary-500/10 flex items-center justify-center">
              <img v-if="photoUrl" :src="photoUrl" class="w-full h-full object-cover" alt="photo" />
              <span v-else class="text-primary-500 text-2xl font-bold">{{ initials }}</span>
            </div>
            <button v-if="can('employees')"
              class="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              :disabled="uploading"
              @click="photoInput?.click()"
            >
              <component :is="Camera" class="w-5 h-5 text-white" />
            </button>
            <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="uploadPhoto" />
            <!-- Online dot -->
            <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1a1d27]"
              :class="employee.is_active ? 'bg-emerald-500' : 'bg-gray-400'" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ employee.full_name }}</h2>
                <p class="text-sm text-gray-400 mt-0.5">{{ employee.phone }}</p>
              </div>
              <AppBadge :variant="employee.is_active ? 'active' : 'inactive'" size="sm" class="shrink-0" />
            </div>

            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span v-if="employee.position"
                class="text-xs font-medium px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {{ employee.position }}
              </span>
              <span v-if="employee.branch?.name"
                class="text-xs font-medium px-2 py-0.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                {{ employee.branch.name }}
              </span>
              <span v-if="employee.department?.name"
                class="text-xs font-medium px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {{ employee.department.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Quick stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Asosiy maosh</p>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ formatMoney(Number(employee.base_salary)) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Soatlik stavka</p>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {{ formatMoney(Math.round(effectiveHourlyRate)) }}
              <span class="text-xs font-normal text-gray-400">{{ employee.hourly_rate ? '' : '(auto)' }}</span>
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Ish soati</p>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ employee.work_hours_per_day ?? 8 }} soat/kun</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Ishga kirgan</p>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ employee.hire_date ? formatDate(employee.hire_date) : '—' }}</p>
          </div>
        </div>

        <!-- Dam olish kunlari -->
        <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-2">Dam olish kunlari</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="day in ALL_WEEK_DAYS" :key="day"
              :class="['px-2.5 py-1 text-xs rounded-lg font-medium transition-colors',
                (employee.off_days ?? []).includes(day)
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400']">
              {{ WEEK_DAY_LABELS[day] }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div class="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          <button v-for="tab in tabs" :key="tab.key"
            :class="['flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300']"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>

        <div class="p-5">
          <GeneralTab
            v-if="activeTab === 'general'"
            :employee="employee"
            :branches="branches"
            :departments="departments"
            :can-edit="can('employees')"
            :saving="saving"
            @save="onSave"
          />
          <AttendanceTab v-else-if="activeTab === 'attendance'" :employee-id="id" />
          <SalaryTab     v-else-if="activeTab === 'salary'"     :employee-id="id" />
          <BonusTab      v-else-if="activeTab === 'bonus'"      :employee-id="id" />
          <KpiTab        v-else-if="activeTab === 'kpi'"        :employee-id="id" />
        </div>
      </div>

    </template>
  </div>
</template>