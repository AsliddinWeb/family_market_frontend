<script setup lang="ts">
import { computed } from 'vue'
import { usePermission } from '@/composables/usePermission'
import EmployeeAttendance from './EmployeeAttendance.vue'
import ManagerAttendance from './ManagerAttendance.vue'

const { isRole } = usePermission()
const isEmployee = computed(() => isRole.value('employee'))
</script>

<template>
  <EmployeeAttendance v-if="isEmployee" />
  <ManagerAttendance v-else />
</template>