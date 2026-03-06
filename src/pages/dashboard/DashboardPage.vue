<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import {
  Users, Clock, UserX, DollarSign,
  CheckCircle, AlertCircle,
} from 'lucide-vue-next'
import { useDashboardStore } from '@/stores/dashboard'
import StatCard from '@/components/ui/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AttendanceChart from '@/components/charts/AttendanceChart.vue'
import SalaryTrend from '@/components/charts/SalaryTrend.vue'
import BranchChart from '@/components/charts/BranchChart.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { formatTime, formatMoney } from '@/utils/format'
import { useRouter } from 'vue-router'
import api from '@/composables/useApi'
import { ref } from 'vue'
import type { LeaveOut, SalaryRecordOut } from '@/types'

const store  = useDashboardStore()
const router = useRouter()

const pendingLeaves  = ref<LeaveOut[]>([])
const draftSalaries  = ref<SalaryRecordOut[]>([])

async function fetchPending() {
  const [l, s] = await Promise.allSettled([
    api.get('/api/leaves',  { params: { status: 'pending', size: 5, page: 1 } }),
    api.get('/api/salary',  { params: { status: 'draft',   size: 5, page: 1 } }),
  ])
  if (l.status === 'fulfilled') pendingLeaves.value  = l.value.data.items ?? []
  if (s.status === 'fulfilled') draftSalaries.value  = s.value.data.items ?? []
}

// 10 soniya polling — feed yangilanadi
const { pause } = useIntervalFn(() => store.fetchFeed(), 10000)

onMounted(async () => {
  await Promise.all([store.fetchStats(), store.fetchFeed(), fetchPending()])
})

onUnmounted(() => pause())
</script>

<template>
  <div class="space-y-6">

    <!-- Page header -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <p class="text-sm text-gray-400 mt-0.5">Bugungi holat va umumiy statistika</p>
    </div>

    <!-- ── Stat Cards ─────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <template v-if="store.loading">
        <SkeletonLoader v-for="i in 4" :key="i" variant="stat" />
      </template>
      <template v-else>
        <StatCard
          :icon="Users"
          label="Bugun keldi"
          :value="store.stats?.today_present ?? 0"
          unit="ta"
          color="green"
        />
        <StatCard
          :icon="Clock"
          label="Kech keldi"
          :value="store.stats?.today_late ?? 0"
          unit="ta"
          color="amber"
        />
        <StatCard
          :icon="UserX"
          label="Kelmadi"
          :value="store.stats?.today_absent ?? 0"
          unit="ta"
          color="red"
        />
        <StatCard
          :icon="DollarSign"
          label="Oy maoshi"
          :value="store.stats ? new Intl.NumberFormat('uz-UZ', { notation: 'compact' }).format(store.stats.monthly_salary_total) : '0'"
          unit="so'm"
          color="indigo"
        />
      </template>
    </div>

    <!-- ── Charts ─────────────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <AttendanceChart />
      </div>
      <div>
        <BranchChart />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Salary trend -->
      <SalaryTrend />

      <!-- Realtime feed -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Bugungi kelishlar</h3>
            <p class="text-xs text-gray-400 mt-0.5">Har 10 soniyada yangilanadi</p>
          </div>
          <span class="flex items-center gap-1.5 text-xs text-emerald-500">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <div v-if="!store.feed.length" class="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">Hozircha ma'lumot yo'q</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="item in store.feed"
            :key="item.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736] hover:bg-gray-100 dark:hover:bg-[#2a2f42] transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                <span class="text-primary-500 text-xs font-semibold">
                  {{ item.employee?.full_name?.slice(0, 2).toUpperCase() ?? 'XX' }}
                </span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {{ item.employee?.full_name ?? '—' }}
                </p>
                <p class="text-xs text-gray-400 truncate">
                  {{ item.employee?.branch?.name ?? '—' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs text-gray-400">
                {{ item.check_in_time ? formatTime(item.check_in_time) : '—' }}
              </span>
              <AppBadge :variant="item.status" size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Pending Actions ────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Pending leaves -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Kutilayotgan ta'tillar</h3>
            <span
              v-if="pendingLeaves.length"
              class="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold flex items-center justify-center"
            >
              {{ pendingLeaves.length }}
            </span>
          </div>
          <button
            class="text-xs text-primary-500 hover:text-primary-600 font-medium"
            @click="router.push('/leaves')"
          >
            Barchasi →
          </button>
        </div>

        <div v-if="!pendingLeaves.length" class="flex flex-col items-center justify-center py-8">
          <CheckCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">Kutilayotgan so'rovlar yo'q</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="leave in pendingLeaves"
            :key="leave.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736] cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            @click="router.push('/leaves')"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {{ leave.employee?.full_name ?? '—' }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ leave.start_date }} — {{ leave.end_date }}
              </p>
            </div>
            <AppBadge variant="pending" size="sm" />
          </div>
        </div>
      </div>

      <!-- Draft salaries -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Qoralama oyliklar</h3>
            <span
              v-if="draftSalaries.length"
              class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center"
            >
              {{ draftSalaries.length }}
            </span>
          </div>
          <button
            class="text-xs text-primary-500 hover:text-primary-600 font-medium"
            @click="router.push('/salary')"
          >
            Barchasi →
          </button>
        </div>

        <div v-if="!draftSalaries.length" class="flex flex-col items-center justify-center py-8">
          <AlertCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">Qoralama oyliklar yo'q</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="sal in draftSalaries"
            :key="sal.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
            @click="router.push('/salary')"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {{ sal.employee?.full_name ?? '—' }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ formatMoney(sal.net_salary) }}
              </p>
            </div>
            <AppBadge variant="draft" size="sm" />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>