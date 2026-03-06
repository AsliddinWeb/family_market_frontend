<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-vue-next'
import SkeletonLoader from './SkeletonLoader.vue'

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  mobileTitle?: boolean   // mobile card da bold title bo'lsin
  mobileHide?: boolean    // mobile da ko'rsatilmasin
}

interface Props {
  columns: TableColumn[]
  rows: T[]
  loading?: boolean
  skeletonRows?: number
  emptyText?: string
  rowKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  skeletonRows: 5,
  emptyText: 'Ma\'lumot topilmadi',
  rowKey: 'id',
})

const emit = defineEmits<{
  sort: [key: string, direction: 'asc' | 'desc']
}>()

// Sort state
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')

function onSort(col: TableColumn) {
  if (!col.sortable) return
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = col.key
    sortDir.value = 'asc'
  }
  emit('sort', sortKey.value, sortDir.value)
}

function getSortIcon(col: TableColumn) {
  if (!col.sortable) return null
  if (sortKey.value !== col.key) return ChevronsUpDown
  return sortDir.value === 'asc' ? ChevronUp : ChevronDown
}

// Mobile title column
const mobileTitleCol = computed(() =>
  props.columns.find((c) => c.mobileTitle) ?? props.columns[0] ?? null,
)

const mobileBodyCols = computed(() =>
  props.columns.filter((c) => !c.mobileTitle && !c.mobileHide),
)
</script>

<template>
  <div>
    <!-- ── DESKTOP TABLE ─────────────────────────────── -->
    <div class="hidden lg:block overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
      <table class="w-full text-sm">
        <!-- Sticky header -->
        <thead class="sticky top-0 bg-gray-50 dark:bg-[#232736] z-10">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="col.width ? `width:${col.width}` : ''"
              :class="[
                'px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700',
                col.align === 'center' && 'text-center',
                col.align === 'right'  && 'text-right',
                !col.align             && 'text-left',
                col.sortable           && 'cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300',
              ]"
              @click="onSort(col)"
            >
              <div class="inline-flex items-center gap-1">
                {{ col.label }}
                <component
                  :is="getSortIcon(col)"
                  v-if="col.sortable"
                  :class="[
                    'w-3.5 h-3.5',
                    sortKey === col.key ? 'text-primary-500' : 'text-gray-300',
                  ]"
                />
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="bg-white dark:bg-[#1a1d27] divide-y divide-gray-50 dark:divide-gray-700/50">
          <!-- Loading -->
          <template v-if="loading">
            <SkeletonLoader variant="table" :rows="skeletonRows" />
          </template>

          <!-- Empty -->
          <template v-else-if="!rows.length">
            <tr>
              <td :colspan="columns.length" class="px-4 py-16 text-center">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg class="w-8 h-8 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p class="text-sm text-gray-400">{{ emptyText }}</p>
                </div>
              </td>
            </tr>
          </template>

          <!-- Rows -->
          <template v-else>
            <tr
              v-for="(row, idx) in rows"
              :key="row[rowKey] ?? idx"
              class="hover:bg-primary-500/5 transition-colors duration-100"
              :style="`animation: fadeInRow 150ms ease forwards; animation-delay: ${idx * 20}ms; opacity: 0`"
              :class="idx % 2 === 1 ? 'bg-gray-50/60 dark:bg-white/[0.02]' : ''"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                :class="[
                  'px-4 py-3 text-gray-700 dark:text-gray-300',
                  col.align === 'center' && 'text-center',
                  col.align === 'right'  && 'text-right',
                ]"
              >
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  {{ row[col.key] ?? '—' }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- ── MOBILE CARD VIEW ──────────────────────────── -->
    <div class="lg:hidden space-y-3">
      <!-- Loading -->
      <template v-if="loading">
        <SkeletonLoader variant="card" :rows="skeletonRows" />
      </template>

      <!-- Empty -->
      <template v-else-if="!rows.length">
        <div class="flex flex-col items-center gap-2 py-16">
          <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-sm text-gray-400">{{ emptyText }}</p>
        </div>
      </template>

      <!-- Cards -->
      <template v-else>
        <div
          v-for="(row, idx) in rows"
          :key="row[rowKey] ?? idx"
          class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
          :style="`animation: fadeInRow 150ms ease forwards; animation-delay: ${idx * 20}ms; opacity: 0`"
        >
          <!-- Card header: title + status slot -->
          <div class="flex items-start justify-between mb-3">
            <div class="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              <template v-if="mobileTitleCol">
                <slot
                  :name="`cell-${mobileTitleCol.key}`"
                  :row="row"
                  :value="row[mobileTitleCol.key]"
                >
                  {{ row[mobileTitleCol.key] ?? '—' }}
                </slot>
              </template>
            </div>
            <!-- Status badge slot -->
            <slot name="mobile-status" :row="row" />
          </div>

          <!-- 2-col grid -->
          <div class="grid grid-cols-2 gap-x-4 gap-y-2">
            <div
              v-for="col in mobileBodyCols"
              :key="col.key"
            >
              <p class="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">
                {{ col.label }}
              </p>
              <div class="text-sm text-gray-700 dark:text-gray-300">
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  {{ row[col.key] ?? '—' }}
                </slot>
              </div>
            </div>
          </div>

          <!-- Actions slot -->
          <div v-if="$slots['mobile-actions']" class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <slot name="mobile-actions" :row="row" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>