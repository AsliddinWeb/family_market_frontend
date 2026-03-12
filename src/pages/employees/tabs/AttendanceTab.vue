<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatDate } from '@/utils/format'
import type { AttendanceOut } from '@/types'
import api from '@/composables/useApi'

const props = defineProps<{ employeeId: number }>()

const records = ref<AttendanceOut[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/api/attendance', {
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
      Davomat ma'lumoti topilmadi
    </div>

    <div v-else class="space-y-2">
      <div v-for="a in records" :key="a.id"
        class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
        <div>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ formatDate(a.date) }}</p>
          <p class="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            <span>{{ a.check_in_time ?? '—' }}</span>
            <template v-if="a.check_out_time">
              <span>→</span>
              <span>{{ a.check_out_time }}</span>
            </template>
            <span v-if="a.source === 'telegram'" class="text-blue-400">📱 Telegram</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="a.late_minutes > 0" class="text-xs text-amber-500 font-medium">
            +{{ a.late_minutes }} min
          </span>
          <AppBadge :variant="a.status" size="sm" />
        </div>
      </div>
    </div>
  </div>
</template>