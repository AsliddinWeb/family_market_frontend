<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Clock, Users, Umbrella, CheckCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import api from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import StatCard from '@/components/ui/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { formatTime } from '@/utils/format'
import type { LeaveOut } from '@/types'

const router = useRouter()
const auth   = useAuthStore()

const loading        = ref(true)
const todayPresent   = ref(0)
const todayLate      = ref(0)
const todayAbsent    = ref(0)
const pendingLeaves  = ref<LeaveOut[]>([])
const todayFeed      = ref<any[]>([])

onMounted(async () => {
  const [stats, leaves, feed] = await Promise.allSettled([
    api.get('/api/attendance/stats/today'),
    api.get('/api/leaves', { params: { status: 'pending', page: 1, size: 5 } }),
    api.get('/api/attendance', { params: { page: 1, size: 10 } }),
  ])

  if (stats.status === 'fulfilled') {
    todayPresent.value = stats.value.data.today_present ?? 0
    todayLate.value    = stats.value.data.today_late    ?? 0
    todayAbsent.value  = stats.value.data.today_absent  ?? 0
  }
  if (leaves.status === 'fulfilled') pendingLeaves.value = leaves.value.data.items ?? []
  if (feed.status === 'fulfilled')   todayFeed.value     = feed.value.data.items   ?? []

  loading.value = false
})
</script>

<template>
  <div class="space-y-6">

    <div>
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <p class="text-sm text-gray-400 mt-0.5">Filial boshqaruv paneli</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 3" :key="i" variant="stat" />
      </template>
      <template v-else>
        <StatCard :icon="Users"   label="Bugun keldi"   :value="todayPresent"  unit="ta" color="green" />
        <StatCard :icon="Clock"   label="Kech keldi"    :value="todayLate"     unit="ta" color="amber" />
        <StatCard :icon="Umbrella" label="Kutilayotgan ta'til" :value="pendingLeaves.length" unit="ta" color="red" />
      </template>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Today attendance -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Bugungi davomat</h3>
            <p class="text-xs text-gray-400 mt-0.5">Filialdagi xodimlar holati</p>
          </div>
          <button class="text-xs text-primary-500 hover:text-primary-600 font-medium" @click="router.push('/attendance')">
            Barchasi →
          </button>
        </div>

        <div v-if="!todayFeed.length" class="flex flex-col items-center justify-center py-10">
          <CheckCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">Hozircha ma'lumot yo'q</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="item in todayFeed" :key="item.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736] hover:bg-gray-100 dark:hover:bg-[#2a2f42] transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                <span class="text-primary-500 text-xs font-semibold">
                  {{ item.employee?.full_name?.slice(0, 2).toUpperCase() ?? 'XX' }}
                </span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ item.employee?.full_name ?? '—' }}</p>
                <p class="text-xs text-gray-400">{{ item.check_in_time ? formatTime(item.check_in_time) : '—' }}</p>
              </div>
            </div>
            <AppBadge :variant="item.status" size="sm" />
          </div>
        </div>
      </div>

      <!-- Pending leaves -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Kutilayotgan ta'tillar</h3>
            <span v-if="pendingLeaves.length"
              class="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[11px] font-bold flex items-center justify-center">
              {{ pendingLeaves.length }}
            </span>
          </div>
          <button class="text-xs text-primary-500 hover:text-primary-600 font-medium" @click="router.push('/leaves')">
            Barchasi →
          </button>
        </div>

        <div v-if="!pendingLeaves.length" class="flex flex-col items-center justify-center py-10">
          <CheckCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">Kutilayotgan so'rovlar yo'q</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="leave in pendingLeaves" :key="leave.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736] cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            @click="router.push('/leaves')"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ leave.employee?.full_name ?? '—' }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ leave.start_date }} — {{ leave.end_date }}</p>
            </div>
            <AppBadge variant="pending" size="sm" />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>