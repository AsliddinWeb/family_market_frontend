<script setup lang="ts">
import { usePermission } from '@/composables/usePermission'
import AdminDashboard       from './AdminDashboard.vue'
import HrDashboard          from './HrDashboard.vue'
import BranchDashboard      from './BranchDashboard.vue'
import AccountantDashboard  from './AccountantDashboard.vue'
import EmployeeDashboard    from './EmployeeDashboard.vue'

const { isRole } = usePermission()
</script>

<template>
  <AdminDashboard      v-if="isRole('superadmin', 'admin')" />
  <HrDashboard         v-else-if="isRole('hr_manager')" />
  <BranchDashboard     v-else-if="isRole('branch_manager')" />
  <AccountantDashboard v-else-if="isRole('accountant')" />
  <EmployeeDashboard   v-else-if="isRole('employee')" />
</template>