<script setup lang="ts">
/**
 * SalaryPage.vue — Oylik bosh sahifasi
 * Filiallar ro'yxati: har biri uchun oylik statistikasi
 * Filialga bosilsa → SalaryBranchPage
 */
import { ref, computed, onMounted } from 'vue'
import {
  RefreshCw, Building2, Users, DollarSign,
  CheckCircle2, FileText, ChevronRight, Calendar, Wallet,
} from 'lucide-vue-next'
import AppButton   from '@/components/ui/AppButton.vue'
import StatCard    from '@/components/ui/StatCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { useToastStore }  from '@/stores/toast'
import { usePermission }  from '@/composables/usePermission'
import api from '@/composables/useApi'
import { formatMoney, formatMonth, currentYearMonth } from '@/utils/format'
import type { BranchOut, SalaryRecordOut } from '@/types'

const toast = useToastStore()
const { isRole } = usePermission()

// ── Period ────────────────────────────────────────────────────────────────
const { year: initYear, month: initMonth } = currentYearMonth()
const filterYear  = ref(initYear)
const filterMonth = ref(initMonth)
const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun',
                'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const years = Array.from({ length: 5 }, (_, i) => initYear - 2 + i)

// ── Data ──────────────────────────────────────────────────────────────────
const branches   = ref<BranchOut[]>([])
const allRecords = ref<SalaryRecordOut[]>([])
const loading    = ref(false)

async function fetchAll() {
  loading.value = true
  try {
    const [bRes, sRes] = await Promise.all([
      api.get('/api/branches', { params: { size: 100 } }),
      api.get('/api/salary',   { params: { year: filterYear.value, month: filterMonth.value, size: 100 } }),
    ])
    branches.value   = bRes.data.items ?? []
    allRecords.value = sRes.data.items ?? []
  } catch {
    toast.error('Ma\'lumotlar yuklanmadi')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

// ── Branch stats ──────────────────────────────────────────────────────────
interface BranchStat {
  branch:      BranchOut
  empCount:    number
  totalNet:    number
  totalBonus:  number
  totalDeduct: number
  draft:       number
  approved:    number
  paid:        number
}

const branchStats = computed<BranchStat[]>(() =>
  branches.value.map(b => {
    const recs = allRecords.value.filter(r => r.employee?.branch_id === b.id)
    return {
      branch:      b,
      empCount:    recs.length,
      totalNet:    recs.reduce((s, r) => s + Number(r.net_salary    ?? 0), 0),
      totalBonus:  recs.reduce((s, r) => s + Number(r.total_bonus   ?? 0), 0),
      totalDeduct: recs.reduce((s, r) => s + Number(r.total_deduction ?? 0), 0),
      draft:       recs.filter(r => r.status === 'draft').length,
      approved:    recs.filter(r => r.status === 'approved').length,
      paid:        recs.filter(r => r.status === 'paid').length,
    }
  })
)

// ── Global stats ──────────────────────────────────────────────────────────
const globalStats = computed(() => ({
  totalNet:    allRecords.value.reduce((s, r) => s + Number(r.net_salary      ?? 0), 0),
  totalBonus:  allRecords.value.reduce((s, r) => s + Number(r.total_bonus     ?? 0), 0),
  totalDeduct: allRecords.value.reduce((s, r) => s + Number(r.total_deduction ?? 0), 0),
  paid:        allRecords.value.filter(r => r.status === 'paid').length,
  approved:    allRecords.value.filter(r => r.status === 'approved').length,
  draft:       allRecords.value.filter(r => r.status === 'draft').length,
}))

// ── Navigation ────────────────────────────────────────────────────────────
const emit = defineEmits<{
  (e: 'open-branch', branchId: number, year: number, month: number): void
}>()

function openBranch(branchId: number) {
  emit('open-branch', branchId, filterYear.value, filterMonth.value)
}

// ── Helpers ───────────────────────────────────────────────────────────────
const selectCls = 'text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500'
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Oylik</h1>
        <p class="text-sm text-gray-400 mt-0.5">Filiallar bo'yicha maosh boshqaruvi</p>
      </div>
      <AppButton variant="ghost" size="sm" :loading="loading" @click="fetchAll">
        <component :is="RefreshCw" class="w-4 h-4" />
        Yangilash
      </AppButton>
    </div>

    <!-- Period filter -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex items-center gap-2 text-primary-500">
          <component :is="Calendar" class="w-4 h-4" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Davr:</span>
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Yil</label>
          <select v-model.number="filterYear" :class="selectCls">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Oy</label>
          <select v-model.number="filterMonth" :class="selectCls">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
        <AppButton variant="primary" size="sm" @click="fetchAll">
          Ko'rsatish
        </AppButton>
        <p class="ml-auto text-sm font-medium text-gray-500 dark:text-gray-400 self-end">
          {{ formatMonth(filterYear, filterMonth) }}
        </p>
      </div>
    </div>

    <!-- Global stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :icon="Wallet"       label="Jami to'lov"    :value="formatMoney(globalStats.totalNet)"    color="blue"   />
      <StatCard :icon="CheckCircle2" label="To'landi"        :value="globalStats.paid"                    color="green"  />
      <StatCard :icon="FileText"     label="Kutmoqda"        :value="globalStats.approved + globalStats.draft" color="amber" />
      <StatCard :icon="Building2"    label="Faol filiallar"  :value="branches.length"                     color="indigo" />
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 6" :key="i"
        class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3"
      >
        <SkeletonLoader variant="text" class="w-32" />
        <SkeletonLoader variant="text" class="w-24" />
        <SkeletonLoader variant="text" class="w-full" />
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="!branches.length"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <component :is="Building2" class="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
      <p class="text-sm text-gray-400">Filiallar topilmadi</p>
    </div>

    <!-- Branch cards -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="(bs, idx) in branchStats" :key="bs.branch.id"
        class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5
               cursor-pointer hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700
               transition-all group"
        :style="`animation: fadeInRow 150ms ease forwards; animation-delay: ${idx * 40}ms; opacity: 0`"
        @click="openBranch(bs.branch.id)"
      >
        <!-- Branch header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
              <component :is="Building2" class="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {{ bs.branch.name }}
              </h3>
              <div class="flex items-center gap-1 mt-0.5">
                <component :is="Users" class="w-3 h-3 text-gray-400" />
                <span class="text-xs text-gray-400">{{ bs.empCount }} ta xodim</span>
              </div>
            </div>
          </div>
          <component :is="ChevronRight" class="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors mt-1" />
        </div>

        <!-- Net salary (asosiy ko'rsatkich) -->
        <div class="mb-4">
          <p class="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Jami sof maosh</p>
          <p class="text-xl font-bold font-mono text-gray-900 dark:text-gray-100">
            {{ formatMoney(bs.totalNet) }}
          </p>
        </div>

        <!-- Bonus / Jarima -->
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2">
            <p class="text-[10px] text-green-500 uppercase tracking-wide mb-0.5">Bonus</p>
            <p class="text-sm font-bold font-mono text-green-600">
              +{{ formatMoney(bs.totalBonus) }}
            </p>
          </div>
          <div class="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
            <p class="text-[10px] text-red-400 uppercase tracking-wide mb-0.5">Jarima</p>
            <p class="text-sm font-bold font-mono text-red-500">
              -{{ formatMoney(bs.totalDeduct) }}
            </p>
          </div>
        </div>

        <!-- Status progress bar -->
        <div v-if="bs.empCount > 0">
          <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1.5">
            <span>Holat</span>
            <span>{{ bs.empCount }} ta</span>
          </div>

          <!-- Progress bar -->
          <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
            <div
              v-if="bs.paid > 0"
              class="h-full bg-green-400 transition-all"
              :style="`width: ${(bs.paid / bs.empCount) * 100}%`"
            />
            <div
              v-if="bs.approved > 0"
              class="h-full bg-blue-400 transition-all"
              :style="`width: ${(bs.approved / bs.empCount) * 100}%`"
            />
            <div
              v-if="bs.draft > 0"
              class="h-full bg-gray-300 dark:bg-gray-600 transition-all"
              :style="`width: ${(bs.draft / bs.empCount) * 100}%`"
            />
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-3 mt-2">
            <div v-if="bs.paid > 0" class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-green-400" />
              <span class="text-[10px] text-gray-400">To'landi {{ bs.paid }}</span>
            </div>
            <div v-if="bs.approved > 0" class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-blue-400" />
              <span class="text-[10px] text-gray-400">Tasdiqlangan {{ bs.approved }}</span>
            </div>
            <div v-if="bs.draft > 0" class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span class="text-[10px] text-gray-400">Qoralama {{ bs.draft }}</span>
            </div>
            <div v-if="bs.empCount === 0" class="flex items-center gap-1">
              <span class="text-[10px] text-gray-400">Bu oy uchun oylik yaratilmagan</span>
            </div>
          </div>
        </div>

        <!-- No records -->
        <div v-else class="text-center py-2">
          <p class="text-xs text-gray-400 italic">Bu oy uchun oylik yo'q</p>
        </div>
      </div>
    </div>

  </div>
</template>