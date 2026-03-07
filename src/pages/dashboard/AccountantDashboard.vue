<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import api from '@/composables/useApi'
import StatCard from '@/components/ui/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { formatMoney } from '@/utils/format'
import type { SalaryRecordOut } from '@/types'

const router = useRouter()

const loading       = ref(true)
const draftSalaries = ref<SalaryRecordOut[]>([])
const paidSalaries  = ref<SalaryRecordOut[]>([])
const totalDraft    = ref(0)
const totalPaid     = ref(0)
const draftAmount   = ref(0)
const paidAmount    = ref(0)

onMounted(async () => {
  const [drafts, paid] = await Promise.allSettled([
    api.get('/api/salary', { params: { status: 'draft',  page: 1, size: 5 } }),
    api.get('/api/salary', { params: { status: 'paid',   page: 1, size: 5 } }),
  ])

  if (drafts.status === 'fulfilled') {
    draftSalaries.value = drafts.value.data.items ?? []
    totalDraft.value    = drafts.value.data.total  ?? 0
    draftAmount.value   = draftSalaries.value.reduce((s: number, r: any) => s + Number(r.net_salary), 0)
  }
  if (paid.status === 'fulfilled') {
    paidSalaries.value = paid.value.data.items ?? []
    totalPaid.value    = paid.value.data.total  ?? 0
    paidAmount.value   = paidSalaries.value.reduce((s: number, r: any) => s + Number(r.net_salary), 0)
  }

  loading.value = false
})
</script>

<template>
  <div class="space-y-6">

    <div>
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <p class="text-sm text-gray-400 mt-0.5">Moliya boshqaruv paneli</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 4" :key="i" variant="stat" />
      </template>
      <template v-else>
        <StatCard :icon="FileText"   label="Qoralama oyliklar" :value="totalDraft" unit="ta" color="amber" />
        <StatCard :icon="DollarSign" label="Qoralama summa"
          :value="new Intl.NumberFormat('uz-UZ', { notation: 'compact' }).format(draftAmount)"
          unit="so'm" color="red"
        />
        <StatCard :icon="CheckCircle" label="To'langan oyliklar" :value="totalPaid" unit="ta" color="green" />
        <StatCard :icon="DollarSign"  label="To'langan summa"
          :value="new Intl.NumberFormat('uz-UZ', { notation: 'compact' }).format(paidAmount)"
          unit="so'm" color="indigo"
        />
      </template>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Draft salaries -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Qoralama oyliklar</h3>
            <span v-if="draftSalaries.length"
              class="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[11px] font-bold flex items-center justify-center">
              {{ totalDraft }}
            </span>
          </div>
          <button class="text-xs text-primary-500 hover:text-primary-600 font-medium" @click="router.push('/salary')">
            Barchasi →
          </button>
        </div>

        <div v-if="!draftSalaries.length" class="flex flex-col items-center justify-center py-8">
          <AlertCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">Qoralama oyliklar yo'q</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="sal in draftSalaries" :key="sal.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736] cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            @click="router.push('/salary')"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ sal.employee?.full_name ?? '—' }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ formatMoney(Number(sal.net_salary)) }}</p>
            </div>
            <AppBadge variant="draft" size="sm" />
          </div>
        </div>
      </div>

      <!-- Paid salaries -->
      <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">To'langan oyliklar</h3>
            <span v-if="paidSalaries.length"
              class="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 text-[11px] font-bold flex items-center justify-center">
              {{ totalPaid }}
            </span>
          </div>
          <button class="text-xs text-primary-500 hover:text-primary-600 font-medium" @click="router.push('/salary')">
            Barchasi →
          </button>
        </div>

        <div v-if="!paidSalaries.length" class="flex flex-col items-center justify-center py-8">
          <CheckCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p class="text-sm text-gray-400">To'langan oyliklar yo'q</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="sal in paidSalaries" :key="sal.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736] cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
            @click="router.push('/salary')"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ sal.employee?.full_name ?? '—' }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ formatMoney(Number(sal.net_salary)) }}</p>
            </div>
            <AppBadge variant="paid" size="sm" />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>