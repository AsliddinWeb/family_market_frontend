<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Clock, Umbrella, BarChart2, CheckCircle, AlertCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/composables/useApi'
import StatCard from '@/components/ui/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { formatTime } from '@/utils/format'

const router = useRouter()
const auth   = useAuthStore()

const loading          = ref(true)
const myAttendance     = ref<any[]>([])
const myLeaves         = ref<any[]>([])
const myKpi            = ref<any[]>([])
const presentCount     = ref(0)
const lateCount        = ref(0)
const kpiAvg           = ref(0)

onMounted(async () => {
  const [att, leaves, kpi] = await Promise.allSettled([
    api.get('/api/attendance', { params: { page: 1, size: 10 } }),
    api.get('/api/leaves',    { params: { page: 1, size: 5  } }),
    api.get('/api/kpi',       { params: { page: 1, size: 10 } }),
  ])

  if (att.status === 'fulfilled') {
    myAttendance.value = att.value.data.items ?? []
    presentCount.value = myAttendance.value.filter((a: any) => a.status === 'present').length
    lateCount.value    = myAttendance.value.filter((a: any) => a.status === 'late').length
  }
  if (leaves.status === 'fulfilled') myLeaves.value = leaves.value.data.items ?? []
  if (kpi.status === 'fulfilled') {
    myKpi.value = kpi.value.data.items ?? []
    if (myKpi.value.length) {
      const sum = myKpi.value.reduce((s: number, k: any) => s + Number(k.score), 0)
      kpiAvg.value = Math.round(sum / myKpi.value.length)
    }
  }

  loading.value = false
})
</script>

<template>
  <div class="space-y-6">

    <div>
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
        Xush kelibsiz, {{ auth.user?.full_name?.split(' ')[0] ?? 'Xodim' }}! 👋
      </h1>
      <p class="text-sm text-gray-400 mt-0.5">Shaxsiy boshqaruv panelingiz</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 3" :key="i" variant="stat" />
      </template>
      <template v-else>
        <StatCard :icon="CheckCircle" label="Keldim (bu oy)" :value="presentCount" unit="kun" color="green" />
        <StatCard :icon="Clock"       label="Kech keldim"    :value="lateCount"    unit="kun" color="amber" />
        <StatCard :icon="BarChart2"   label="O'rtacha KPI"   :value="kpiAvg"       unit="%"   color="indigo" />
      </template>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- My attendance -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Mening davomatim</h3>
            <p class="text-xs text-gray-400 mt-0.5">So'nggi yozuvlar</p>
          </div>
          <button class="text-xs text-primary-500 hover:text-primary-600 font-medium" @click="router.push('/attendance')">
            Barchasi →
          </button>
        </div>

        <div v-if="!myAttendance.length" class="flex flex-col items-center justify-center py-8">
          <AlertCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">Davomat yozuvlari yo'q</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="item in myAttendance" :key="item.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]"
          >
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ item.date }}</p>
              <p class="text-xs text-gray-400">{{ item.check_in_time ? formatTime(item.check_in_time) : '—' }}</p>
            </div>
            <AppBadge :variant="item.status" size="sm" />
          </div>
        </div>
      </div>

      <!-- My leaves -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Mening ta'tillarim</h3>
            <p class="text-xs text-gray-400 mt-0.5">So'nggi so'rovlar</p>
          </div>
          <button class="text-xs text-primary-500 hover:text-primary-600 font-medium" @click="router.push('/leaves')">
            Barchasi →
          </button>
        </div>

        <div v-if="!myLeaves.length" class="flex flex-col items-center justify-center py-8">
          <Umbrella class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">Ta'til so'rovlari yo'q</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="leave in myLeaves" :key="leave.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]"
          >
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ leave.leave_type }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ leave.start_date }} — {{ leave.end_date }}</p>
            </div>
            <AppBadge :variant="leave.status" size="sm" />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>