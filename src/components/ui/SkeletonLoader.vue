<script setup lang="ts">
interface Props {
  variant?: 'table' | 'card' | 'stat' | 'text' | 'circle'
  rows?: number
}

withDefaults(defineProps<Props>(), {
  variant: 'table',
  rows: 5,
})
</script>

<template>
  <!-- Table rows skeleton -->
  <template v-if="variant === 'table'">
    <tr
      v-for="i in rows"
      :key="i"
      class="animate-pulse border-b border-gray-100 dark:border-gray-700"
    >
      <td class="px-4 py-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-32" />
      </td>
      <td class="px-4 py-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-24" />
      </td>
      <td class="px-4 py-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-28" />
      </td>
      <td class="px-4 py-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-20" />
      </td>
      <td class="px-4 py-3">
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
      </td>
      <td class="px-4 py-3">
        <div class="flex gap-2">
          <div class="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div class="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </td>
    </tr>
  </template>

  <!-- Card skeleton -->
  <template v-else-if="variant === 'card'">
    <div
      v-for="i in rows"
      :key="i"
      class="animate-pulse bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-gray-700"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div v-for="j in 4" :key="j" class="space-y-1">
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
      </div>
    </div>
  </template>

  <!-- Stat card skeleton -->
  <template v-else-if="variant === 'stat'">
    <div class="animate-pulse bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <div class="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div class="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1" />
      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
    </div>
  </template>

  <!-- Text lines skeleton -->
  <div v-else-if="variant === 'text'" class="animate-pulse space-y-2">
    <div v-for="i in rows" :key="i"
      :class="['h-4 bg-gray-200 dark:bg-gray-700 rounded', i === rows ? 'w-2/3' : 'w-full']"
    />
  </div>

  <!-- Circle skeleton -->
  <template v-else-if="variant === 'circle'">
    <div class="animate-pulse flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div class="flex-1 space-y-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    </div>
  </template>
</template>