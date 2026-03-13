<script setup lang="ts">
/**
 * SalaryIndex.vue — Salary router wrapper
 * view === 'list'   → SalaryPage (filiallar)
 * view === 'branch' → SalaryBranchPage (filial ichida)
 *
 * Hozirgi router da SalaryPage o'rniga SalaryIndex ishlatiladi.
 */
import { ref } from 'vue'
import SalaryPage       from './SalaryPage.vue'
import SalaryBranchPage from './SalaryBranchPage.vue'

type View = 'list' | 'branch'

const view         = ref<View>('list')
const activeBranch = ref<{ id: number; year: number; month: number } | null>(null)

function openBranch(branchId: number, year: number, month: number) {
  activeBranch.value = { id: branchId, year, month }
  view.value         = 'branch'
}

function goBack() {
  view.value         = 'list'
  activeBranch.value = null
}
</script>

<template>
  <SalaryPage
    v-if="view === 'list'"
    @open-branch="openBranch"
  />
  <SalaryBranchPage
    v-else-if="view === 'branch' && activeBranch"
    :branch-id="activeBranch.id"
    :init-year="activeBranch.year"
    :init-month="activeBranch.month"
    @back="goBack"
  />
</template>