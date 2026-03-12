<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatMoney, formatMonth } from '@/utils/format'
import { BONUS_TYPE_LABELS } from '@/types'
import type { BonusOut, DeductionOut } from '@/types'
import api from '@/composables/useApi'

const props = defineProps<{ employeeId: number }>()

const bonuses    = ref<BonusOut[]>([])
const deductions = ref<DeductionOut[]>([])
const loading    = ref(false)

async function load() {
  loading.value = true
  try {
    const [b, d] = await Promise.allSettled([
      api.get('/api/bonuses',    { params: { employee_id: props.employeeId, size: 100, page: 1 } }),
      api.get('/api/deductions', { params: { employee_id: props.employeeId, size: 100, page: 1 } }),
    ])
    if (b.status === 'fulfilled') bonuses.value    = b.value.data.items ?? []
    if (d.status === 'fulfilled') deductions.value = d.value.data.items ?? []
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

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Bonuslar -->
      <div>
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Bonuslar</h4>
        <div v-if="!bonuses.length"
          class="text-center py-8 text-sm text-gray-400 bg-gray-50 dark:bg-[#232736] rounded-xl">
          Bonus yo'q
        </div>
        <div v-else class="space-y-2">
          <div v-for="b in bonuses" :key="b.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
            <div>
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ b.reason ?? BONUS_TYPE_LABELS[b.bonus_type] }}
                </p>
                <span v-if="b.auto_generated"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  auto
                </span>
              </div>
              <p class="text-xs text-gray-400">
                {{ formatMonth(b.period_year, b.period_month) }} · {{ BONUS_TYPE_LABELS[b.bonus_type] }}
              </p>
            </div>
            <span class="text-sm font-bold text-green-500">+{{ formatMoney(Number(b.amount)) }}</span>
          </div>
        </div>
      </div>

      <!-- Jarimalar -->
      <div>
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Jarimalar</h4>
        <div v-if="!deductions.length"
          class="text-center py-8 text-sm text-gray-400 bg-gray-50 dark:bg-[#232736] rounded-xl">
          Jarima yo'q
        </div>
        <div v-else class="space-y-2">
          <div v-for="d in deductions" :key="d.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
            <div>
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ d.reason ?? d.deduction_type }}
                </p>
                <span v-if="d.auto_generated"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  auto
                </span>
              </div>
              <p class="text-xs text-gray-400">{{ formatMonth(d.period_year, d.period_month) }}</p>
            </div>
            <span class="text-sm font-bold text-red-500">-{{ formatMoney(Number(d.amount)) }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>