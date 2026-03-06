<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, type ChartConfiguration, type TooltipItem } from 'chart.js/auto'
import { useUiStore } from '@/stores/ui'
import api from '@/composables/useApi'
import { formatMonth } from '@/utils/format'

const ui     = useUiStore()
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

interface MonthData { label: string; total: number }

const loading   = ref(true)
const chartData = ref<MonthData[]>([])

async function fetchData() {
  const now = new Date()
  const results: MonthData[] = []

  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year  = d.getFullYear()
    const month = d.getMonth() + 1
    try {
      const { data } = await api.get('/api/salary', {
        params: { year, month, size: 100, page: 1 },
      })
      const items: any[] = data.items ?? []
      const total = items.reduce((sum: number, r: any) => sum + (r.net_salary ?? 0), 0)
      results.push({ label: formatMonth(year, month), total })
    } catch (_) {
      results.push({ label: formatMonth(year, month), total: 0 })
    }
  }

  chartData.value = results
  loading.value   = false
}

function buildChart() {
  if (!canvas.value || !chartData.value.length) return
  chart?.destroy()

  const isDark = ui.isDark

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: chartData.value.map((d) => d.label),
      datasets: [
        {
          label: 'Umumiy maosh',
          data: chartData.value.map((d) => d.total),
          borderColor: '#6366f1',
          backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.07)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6366f1',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
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
            label: (ctx: TooltipItem<'line'>) => {
                const parsed = ctx.parsed as any
                return ` ${new Intl.NumberFormat('uz-UZ').format(parsed.y)} so'm`
                },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? '#6b7280' : '#9ca3af',
            font: { size: 11 },
          },
          border: { display: false },
        },
        y: {
          grid: { color: isDark ? '#1f2333' : '#f3f4f6' },
          ticks: {
            color: isDark ? '#6b7280' : '#9ca3af',
            font: { size: 10 },
            callback: (value) => {
              return new Intl.NumberFormat('uz-UZ', { notation: 'compact' }).format(Number(value))
            },
          },
          border: { display: false },
        },
      },
    },
  }

  chart = new Chart(canvas.value, config)
}

watch(() => ui.isDark, () => { buildChart() })
watch(chartData, () => { buildChart() })

onMounted(async () => {
  await fetchData()
  buildChart()
})

onUnmounted(() => {
  chart?.destroy()
})
</script>

<template>
  <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Maosh trendi</h3>
        <p class="text-xs text-gray-400 mt-0.5">So'nggi 6 oy</p>
      </div>
    </div>
    <div v-if="loading" class="h-48 flex items-center justify-center">
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else-if="!chartData.length" class="h-48 flex items-center justify-center">
      <p class="text-sm text-gray-400">Ma'lumot topilmadi</p>
    </div>
    <div v-else class="h-48">
      <canvas ref="canvas" />
    </div>
  </div>
</template>