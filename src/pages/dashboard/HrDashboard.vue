<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Users, UserCheck, Umbrella, BarChart2, CheckCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import api from '@/composables/useApi'
import StatCard from '@/components/ui/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import type { LeaveOut } from '@/types'

const router = useRouter()

const loading       = ref(true)
const totalEmployees = ref(0)
const activeEmployees = ref(0)
const pendingLeaves  = ref<LeaveOut[]>([])
const kpiAvg         = ref<number>(0)

onMounted(async () => {
  const [emp, leaves, kpi] = await Promise.allSettled([
    api.get('/api/employees', { params: { page: 1, size: 1 } }),
    api.get('/api/leaves',   { params: { status: 'pending', page: 1, size: 5 } }),
    api.get('/api/kpi',      { params: { page: 1, size: 100 } }),
  ])

  if (emp.status === 'fulfilled') {
    totalEmployees.value  = emp.value.data.total ?? 0
    activeEmployees.value = emp.value.data.total ?? 0
  }
  if (leaves.status === 'fulfilled') pendingLeaves.value = leaves.value.data.items ?? []
  if (kpi.status === 'fulfilled') {
    const items = kpi.value.data.items ?? []
    if (items.length) {
      const sum = items.reduce((acc: number, k: any) => acc + Number(k.score), 0)
      kpiAvg.value = Math.round(sum / items.length)
    }
  }

  loading.value = false
})
</script>

<template>
  <div class="space-y-6">

    <div>
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <p class="text-sm text-gray-400 mt-0.5">HR boshqaruv paneli</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 4" :key="i" variant="stat" />
      </template>
      <template v-else>
        <StatCard :icon="Users"     label="Jami xodimlar"   :value="totalEmployees"  unit="ta"  color="indigo" />
        <StatCard :icon="UserCheck" label="Faol xodimlar"   :value="activeEmployees" unit="ta"  color="green"  />
        <StatCard :icon="Umbrella"  label="Kutilayotgan ta'til" :value="pendingLeaves.length" unit="ta" color="amber" />
        <StatCard :icon="BarChart2" label="O'rtacha KPI"    :value="kpiAvg"          unit="%"   color="blue"   />
      </template>
    </div>

    <!-- Pending Leaves -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Kutilayotgan ta'til so'rovlari</h3>
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
</template>