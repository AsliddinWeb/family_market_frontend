<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, User, Clock, DollarSign, Gift, BarChart2, Camera, Zap } from 'lucide-vue-next'
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

const id       = Number(route.params.id)
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

const pageLoading = ref(true)
const saving      = ref(false)
const uploading   = ref(false)
const branches    = ref<BranchOut[]>([])
const departments = ref<DepartmentOut[]>([])
const photoInput  = ref<HTMLInputElement | null>(null)

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
  return Math.round(Number(e.base_salary) / ((e.work_hours_per_day ?? 8) * 22))
})

const SHORT_LABELS: Record<string, string> = {
  monday: 'Du', tuesday: 'Se', wednesday: 'Ch',
  thursday: 'Pa', friday: 'Ju', saturday: 'Sh', sunday: 'Ya',
}
</script>

<template>
  <div class="space-y-4">

    <!-- ── Back ───────────────────────────────────────────────────── -->
    <div class="flex items-center gap-3">
      <button
        class="p-2 rounded-xl bg-[#1a1d27] border border-[#2d3148] hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all"
        @click="router.push('/employees')"
      >
        <ArrowLeft class="w-4 h-4 text-gray-400" />
      </button>
      <h1 class="text-lg font-bold text-gray-100">Xodim profili</h1>
    </div>

    <!-- ── Skeleton ───────────────────────────────────────────────── -->
    <template v-if="pageLoading">
      <div class="bg-[#1a1d27] rounded-2xl border border-[#2d3148] p-6 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 rounded-2xl bg-[#2d3148]" />
          <div class="space-y-2 flex-1">
            <div class="h-4 w-40 bg-[#2d3148] rounded-lg" />
            <div class="h-3 w-24 bg-[#2d3148] rounded-lg" />
            <div class="h-3 w-32 bg-[#2d3148] rounded-lg" />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="employee">

      <!-- ── Profile card ───────────────────────────────────────────── -->
      <div class="bg-[#1a1d27] rounded-2xl border border-[#2d3148] overflow-hidden">

        <!-- Gradient header strip -->
        <div class="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <div class="p-5">
          <div class="flex items-start gap-4">

            <!-- Avatar -->
            <div class="relative shrink-0 group">
              <div class="w-[72px] h-[72px] rounded-2xl overflow-hidden bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <img v-if="photoUrl" :src="photoUrl" class="w-full h-full object-cover" alt="photo" />
                <span v-else class="text-indigo-400 text-xl font-bold tracking-tight">{{ initials }}</span>
              </div>
              <button v-if="can('employees')"
                class="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                :disabled="uploading"
                @click="photoInput?.click()"
              >
                <Camera class="w-5 h-5 text-white" />
              </button>
              <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="uploadPhoto" />
              <!-- Active indicator -->
              <div :class="['absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1a1d27]',
                employee.is_active ? 'bg-emerald-500' : 'bg-gray-600']" />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h2 class="text-base font-bold text-gray-100 leading-tight">{{ employee.full_name }}</h2>
                  <p class="text-xs text-gray-500 mt-0.5 font-mono">{{ employee.phone }}</p>
                </div>
                <AppBadge :variant="employee.is_active ? 'active' : 'inactive'" size="sm" class="shrink-0" />
              </div>

              <div class="flex flex-wrap gap-1.5 mt-2">
                <span v-if="employee.position"
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#0f1117] text-gray-400 border border-[#2d3148]">
                  {{ employee.position }}
                </span>
                <span v-if="employee.branch?.name"
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {{ employee.branch.name }}
                </span>
                <span v-if="employee.department?.name"
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#0f1117] text-gray-500 border border-[#2d3148]">
                  {{ employee.department.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Quick stats row -->
          <div class="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-[#2d3148]">
            <div class="text-center">
              <p class="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Maosh</p>
              <p class="text-xs font-bold text-gray-200">{{ formatMoney(Number(employee.base_salary)) }}</p>
            </div>
            <div class="text-center">
              <p class="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Soatlik</p>
              <p class="text-xs font-bold text-gray-200">
                {{ formatMoney(effectiveHourlyRate) }}
                <span v-if="!employee.hourly_rate" class="text-gray-600 font-normal"> •</span>
              </p>
            </div>
            <div class="text-center">
              <p class="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Ish soat</p>
              <p class="text-xs font-bold text-gray-200">{{ employee.work_hours_per_day ?? 8 }}h</p>
            </div>
            <div class="text-center">
              <p class="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Kirgan</p>
              <p class="text-xs font-bold text-gray-200">{{ employee.hire_date ? formatDate(employee.hire_date) : '—' }}</p>
            </div>
          </div>

          <!-- Dam olish kunlari mini -->
          <div class="flex gap-1.5 mt-3">
            <div v-for="day in ALL_WEEK_DAYS" :key="day"
              :class="['flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition-all',
                (employee.off_days ?? []).includes(day)
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                  : 'bg-[#0f1117] text-gray-700 border border-[#2d3148]']"
            >
              {{ SHORT_LABELS[day] }}
            </div>
          </div>
        </div>
      </div>

      <!-- ── Tabs ───────────────────────────────────────────────────── -->
      <div class="bg-[#1a1d27] rounded-2xl border border-[#2d3148] overflow-hidden">

        <!-- Tab bar -->
        <div class="flex border-b border-[#2d3148] overflow-x-auto">
          <button v-for="tab in tabs" :key="tab.key"
            :class="['flex items-center gap-2 px-4 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all',
              activeTab === tab.key
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#0f1117]']"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" class="w-3.5 h-3.5" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab content -->
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