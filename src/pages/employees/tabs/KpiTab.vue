<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatMonth } from '@/utils/format'
import type { KPIOut, KPISummary } from '@/types'
import api from '@/composables/useApi'

const props = defineProps<{ employeeId: number }>()

const kpiList    = ref<KPIOut[]>([])
const kpiSummary = ref<KPISummary | null>(null)
const loading    = ref(false)

const now   = new Date()
const year  = now.getFullYear()
const month = now.getMonth() + 1

async function load() {
  loading.value = true
  try {
    const [k, s] = await Promise.allSettled([
      api.get('/api/kpi',         { params: { employee_id: props.employeeId, year, month, size: 100, page: 1 } }),
      api.get('/api/kpi/summary', { params: { employee_id: props.employeeId, year, month } }),
    ])
    if (k.status === 'fulfilled') kpiList.value    = k.value.data.items ?? []
    if (s.status === 'fulfilled') kpiSummary.value = s.value.data
  } finally {
    loading.value = false
  }
}

const kpiPercent = computed(() => Math.round(kpiSummary.value?.percentage ?? 0))

onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading" class="py-10 flex justify-center">
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>
      <!-- Summary bar -->
      <div v-if="kpiSummary" class="mb-5 p-4 rounded-xl bg-gray-50 dark:bg-[#232736]">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ formatMonth(year, month) }} — Umumiy ball
          </span>
          <span class="text-sm font-bold text-primary-500">{{ kpiPercent }}%</span>
        </div>
        <div class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
            :class="kpiPercent >= 80 ? 'bg-green-500' : kpiPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'"
            :style="`width: ${kpiPercent}%`" />
        </div>
        <p class="text-xs text-gray-400 mt-1">
          {{ kpiSummary.total_score }} / {{ kpiSummary.max_score }} ball
        </p>
      </div>

      <div v-if="!kpiList.length" class="text-center py-10 text-sm text-gray-400">
        KPI ma'lumoti topilmadi
      </div>

      <div v-else class="space-y-2">
        <div v-for="k in kpiList" :key="k.id" class="p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ k.metric_name }}</p>
            <span class="text-xs font-bold text-primary-500">{{ Number(k.score).toFixed(1) }} ball</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-400">
            <span>Maqsad: {{ k.target_value }}</span>
            <span>Haqiqiy: {{ k.actual_value }}</span>
            <span>Og'irlik: {{ k.weight }}</span>
          </div>
          <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-2 overflow-hidden">
            <div class="h-full bg-primary-500 rounded-full transition-all"
              :style="`width: ${Math.min((Number(k.actual_value) / Number(k.target_value)) * 100, 100)}%`" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>