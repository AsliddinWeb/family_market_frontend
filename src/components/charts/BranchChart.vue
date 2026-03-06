<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, type ChartConfiguration } from 'chart.js/auto'
import { useUiStore } from '@/stores/ui'
import api from '@/composables/useApi'

const ui     = useUiStore()
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

interface BranchData { name: string; count: number }

const loading   = ref(true)
const chartData = ref<BranchData[]>([])

async function fetchData() {
  const { data } = await api.get('/api/branches', { params: { size: 100, page: 1 } })
  chartData.value = (data.items ?? []).map((b: any) => ({
    name:  b.name,
    count: b.employee_count ?? 0,
  }))
  loading.value = false
}

function buildChart() {
  if (!canvas.value || !chartData.value.length) return
  chart?.destroy()

  const isDark = ui.isDark

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: chartData.value.map(d => d.name),
      datasets: [{
        label: 'Xodimlar',
        data: chartData.value.map(d => d.count),
        backgroundColor: '#6366f1',
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1a1d27' : '#fff',
          titleColor: isDark ? '#f9fafb' : '#111827',
          bodyColor: isDark ? '#9ca3af' : '#6b7280',
          borderColor: isDark ? '#2d3148' : '#e5e7eb',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.x} xodim`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: isDark ? '#1f2333' : '#f3f4f6' },
          ticks: { color: isDark ? '#6b7280' : '#9ca3af', font: { size: 10 }, stepSize: 1 },
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { color: isDark ? '#9ca3af' : '#6b7280', font: { size: 11 } },
          border: { display: false },
        },
      },
    },
  }

  chart = new Chart(canvas.value, config)
}

watch(() => ui.isDark, () => buildChart())
watch(chartData, () => buildChart())

onMounted(async () => {
  await fetchData()
  buildChart()
})

onUnmounted(() => chart?.destroy())
</script>

<template>
  <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Filiallar bo'yicha</h3>
      <p class="text-xs text-gray-400 mt-0.5">Xodimlar soni</p>
    </div>
    <div v-if="loading" class="h-48 flex items-center justify-center">
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else class="h-48">
      <canvas ref="canvas" />
    </div>
  </div>
</template>