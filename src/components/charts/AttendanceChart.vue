<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, type ChartConfiguration } from 'chart.js/auto'
import { useUiStore } from '@/stores/ui'
import api from '@/composables/useApi'

const ui     = useUiStore()
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

interface DayData {
  date: string
  present: number
  late: number
  absent: number
}

const loading   = ref(true)
const chartData = ref<DayData[]>([])

async function fetchData() {
  const to   = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)

  const toStr   = to.toISOString().split('T')[0]
  const fromStr = from.toISOString().split('T')[0]

  try {
    const { data } = await api.get('/api/attendance', {
      params: { date_from: fromStr, date_to: toStr, size: 100, page: 1 },
    })

    const map = {} as Record<string, DayData>
    const items = (data.items ?? []) as DayData[]

    for (const a of items) {
    const date = a.date
    if (!map[date]) {
        map[date] = { date, present: 0, late: 0, absent: 0 }
    }
    map[date].present += a.present
    map[date].late    += a.late
    map[date].absent  += a.absent
    }

    chartData.value = Object.values(map).sort(
      (a, b) => a.date.localeCompare(b.date),
    )
  } catch {
    chartData.value = []
  } finally {
    loading.value = false
  }
}

function buildChart() {
  if (!canvas.value || !chartData.value.length) return
  chart?.destroy()

  const labels = chartData.value.map((d) => d.date.slice(5))
  const isDark = ui.isDark

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Keldi',
          data: chartData.value.map((d) => d.present),
          backgroundColor: '#22c55e',
          borderRadius: 3,
          stack: 'a',
        },
        {
          label: 'Kech',
          data: chartData.value.map((d) => d.late),
          backgroundColor: '#f59e0b',
          borderRadius: 3,
          stack: 'a',
        },
        {
          label: 'Kelmadi',
          data: chartData.value.map((d) => d.absent),
          backgroundColor: '#ef4444',
          borderRadius: 3,
          stack: 'a',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 3,
            useBorderRadius: true,
            color: isDark ? '#9ca3af' : '#6b7280',
            font: { size: 11 },
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#1a1d27' : '#fff',
          titleColor: isDark ? '#f9fafb' : '#111827',
          bodyColor: isDark ? '#9ca3af' : '#6b7280',
          borderColor: isDark ? '#2d3148' : '#e5e7eb',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            color: isDark ? '#6b7280' : '#9ca3af',
            font: { size: 10 },
            maxTicksLimit: 10,
          },
          border: { display: false },
        },
        y: {
          stacked: true,
          grid: {
            color: isDark ? '#1f2333' : '#f3f4f6',
          },
          ticks: {
            color: isDark ? '#6b7280' : '#9ca3af',
            font: { size: 10 },
            stepSize: 1,
          },
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
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Davomat statistikasi</h3>
        <p class="text-xs text-gray-400 mt-0.5">So'nggi 30 kun</p>
      </div>
    </div>
    <div v-if="loading" class="h-56 flex items-center justify-center">
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else-if="!chartData.length" class="h-56 flex items-center justify-center">
      <p class="text-sm text-gray-400">Ma'lumot topilmadi</p>
    </div>
    <div v-else class="h-56">
      <canvas ref="canvas" />
    </div>
  </div>
</template>