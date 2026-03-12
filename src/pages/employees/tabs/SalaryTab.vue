<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatMoney, formatMonth } from '@/utils/format'
import type { SalaryRecordOut } from '@/types'
import api from '@/composables/useApi'

const props = defineProps<{ employeeId: number }>()

const records = ref<SalaryRecordOut[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/api/salary', {
      params: { employee_id: props.employeeId, size: 100, page: 1 },
    })
    records.value = data.items ?? []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading" class="py-10 flex justify-center">
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="!records.length" class="text-center py-10 text-sm text-gray-400">
      Oylik tarixi topilmadi
    </div>

    <div v-else class="space-y-2">
      <div v-for="s in records" :key="s.id"
        class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
        <div>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
            {{ formatMonth(s.period_year, s.period_month) }}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">
            Asosiy: {{ formatMoney(Number(s.base_salary)) }}
            <span v-if="s.total_bonus > 0" class="text-green-500 ml-1">+{{ formatMoney(s.total_bonus) }}</span>
            <span v-if="s.total_deduction > 0" class="text-red-500 ml-1">-{{ formatMoney(s.total_deduction) }}</span>
          </p>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
            {{ formatMoney(Number(s.net_salary)) }}
          </p>
          <AppBadge :variant="s.status" size="sm" class="mt-1" />
        </div>
      </div>
    </div>
  </div>
</template>