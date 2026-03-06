<script setup lang="ts">
import { computed, type Component } from 'vue'
import { TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'

interface Props {
  icon: Component
  label: string
  value: string | number
  unit?: string
  color?: 'indigo' | 'green' | 'red' | 'amber' | 'blue'
  trend?: number       // foiz: +12, -5, 0
  trendLabel?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'indigo',
  loading: false,
})

const colorConfig = {
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-500'  },
  red:    { bg: 'bg-red-500/10',    text: 'text-red-500'    },
  amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-500'  },
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-500'   },
}

const trendIcon = computed(() => {
  if (!props.trend) return Minus
  return props.trend > 0 ? TrendingUp : TrendingDown
})

const trendColor = computed(() => {
  if (!props.trend) return 'text-gray-400'
  return props.trend > 0 ? 'text-green-500' : 'text-red-500'
})
</script>

<template>
  <div class="bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
    <!-- Loading state -->
    <template v-if="loading">
      <div class="animate-pulse">
        <div class="flex items-center justify-between mb-4">
          <div class="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div class="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1" />
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      </div>
    </template>

    <template v-else>
      <!-- Top row: icon + trend -->
      <div class="flex items-center justify-between mb-4">
        <div :class="['w-9 h-9 rounded-lg flex items-center justify-center', colorConfig[color].bg]">
          <component :is="icon" :class="['w-5 h-5', colorConfig[color].text]" />
        </div>

        <!-- Trend badge -->
        <div
          v-if="trend !== undefined"
          :class="['inline-flex items-center gap-1 text-xs font-medium', trendColor]"
        >
          <component :is="trendIcon" class="w-3.5 h-3.5" />
          <span>{{ Math.abs(trend) }}%</span>
        </div>
      </div>

      <!-- Value -->
      <div class="flex items-baseline gap-1">
        <span class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ value }}
        </span>
        <span v-if="unit" class="text-sm text-gray-400">{{ unit }}</span>
      </div>

      <!-- Label + trend label -->
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ label }}</p>
      <p v-if="trendLabel" class="text-xs text-gray-400 mt-1">{{ trendLabel }}</p>
    </template>
  </div>
</template>