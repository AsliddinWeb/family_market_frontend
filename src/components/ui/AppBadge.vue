<script setup lang="ts">
import type { AttendanceStatus, SalaryStatus, LeaveStatus } from '@/types'

type BadgeVariant =
  | AttendanceStatus
  | SalaryStatus
  | LeaveStatus
  | 'active'
  | 'inactive'
  | 'default'

interface Props {
  variant: BadgeVariant
  dot?: boolean
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  dot: true,
  size: 'md',
})

const config: Record<BadgeVariant, { label: string; classes: string; dot: string }> = {
  // Attendance
  present:  { label: 'Keldi',      classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   dot: 'bg-green-500' },
  absent:   { label: 'Kelmadi',    classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           dot: 'bg-red-500' },
  late:     { label: 'Kech keldi', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   dot: 'bg-amber-500' },
  half_day: { label: 'Yarim kun',  classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',       dot: 'bg-blue-500' },
  // Salary
  draft:    { label: 'Qoralama',   classes: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',          dot: 'bg-gray-400' },
  approved: { label: 'Tasdiqlandi',classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',       dot: 'bg-blue-500' },
  paid:     { label: "To'landi",   classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   dot: 'bg-green-500' },
  // Leave
  pending:  { label: 'Kutilmoqda', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   dot: 'bg-amber-500' },
  rejected: { label: 'Rad etildi', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           dot: 'bg-red-500' },
  cancelled:{ label: 'Bekor',      classes: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',          dot: 'bg-gray-400' },
  // Employee
  active:   { label: 'Faol',       classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   dot: 'bg-green-500' },
  inactive: { label: 'Nofaol',     classes: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',          dot: 'bg-gray-400' },
  default:  { label: '',           classes: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',          dot: 'bg-gray-400' },
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 font-medium rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      config[variant]?.classes ?? config.default.classes,
    ]"
  >
    <span
      v-if="dot"
      :class="['rounded-full shrink-0', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', config[variant]?.dot ?? 'bg-gray-400']"
    />
    <slot>{{ config[variant]?.label }}</slot>
  </span>
</template>