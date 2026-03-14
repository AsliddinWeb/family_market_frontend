<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  offDays: string[]
  customOffDays: string[]
  customWorkDays: string[]
}>()

const emit = defineEmits<{
  update: [payload: { customOffDays: string[]; customWorkDays: string[] }]
}>()

const WEEKDAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const SHORT_UZ      = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
const MONTH_UZ      = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]

const today     = new Date()
const viewYear  = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

type DayStatus = 'work' | 'weekly-off' | 'custom-off' | 'custom-work'

interface CalendarDay {
  date: string
  day: number
  currentMonth: boolean
  isWeeklyOff: boolean
  isCustomOff: boolean
  isCustomWork: boolean
  isToday: boolean
  status: DayStatus
}

const calendarDays = computed((): CalendarDay[] => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstDayJS  = new Date(y, m, 1).getDay()
  const startOffset = (firstDayJS + 6) % 7
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const daysInPrev  = new Date(y, m, 0).getDate()

  const days: CalendarDay[] = []

  // Oldingi oy qoldiqlari
  for (let i = startOffset - 1; i >= 0; i--) {
    const d    = daysInPrev - i
    const pm   = m === 0 ? 11 : m - 1
    const py   = m === 0 ? y - 1 : y
    const ds   = `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: ds, day: d, currentMonth: false, isWeeklyOff: false, isCustomOff: false, isCustomWork: false, isToday: false, status: 'work' })
  }

  // Joriy oy
  for (let d = 1; d <= daysInMonth; d++) {
    const ds      = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const jsDate  = new Date(y, m, d)
    const weekday = WEEKDAY_NAMES[(jsDate.getDay() + 6) % 7] ?? ''

    const isCustomWork = props.customWorkDays.includes(ds)
    const isCustomOff  = props.customOffDays.includes(ds)
    const isWeeklyOff  = props.offDays.includes(weekday)
    const isToday      = d === today.getDate() && m === today.getMonth() && y === today.getFullYear()

    let status: DayStatus
    if (isCustomWork)     status = 'custom-work'
    else if (isCustomOff) status = 'custom-off'
    else if (isWeeklyOff) status = 'weekly-off'
    else                  status = 'work'

    days.push({ date: ds, day: d, currentMonth: true, isWeeklyOff, isCustomOff, isCustomWork, isToday, status })
  }

  // Keyingi oy (42 ga to'ldirish)
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const nm = m === 11 ? 0 : m + 1
    const ny = m === 11 ? y + 1 : y
    const ds = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: ds, day: d, currentMonth: false, isWeeklyOff: false, isCustomOff: false, isCustomWork: false, isToday: false, status: 'work' })
  }

  return days
})

function toggleDay(cell: CalendarDay) {
  if (!cell.currentMonth) return

  const customOff  = [...props.customOffDays]
  const customWork = [...props.customWorkDays]
  const ds = cell.date

  if (cell.isWeeklyOff) {
    // Haftalik dam → custom_work (ish kuniga aylantir) yoki qaytarish
    const idx = customWork.indexOf(ds)
    if (idx >= 0) {
      customWork.splice(idx, 1)
    } else {
      customWork.push(ds)
      const i = customOff.indexOf(ds)
      if (i >= 0) customOff.splice(i, 1)
    }
  } else {
    // Ish kuni → custom_off (dam olishga aylantir) yoki qaytarish
    const idx = customOff.indexOf(ds)
    if (idx >= 0) {
      customOff.splice(idx, 1)
    } else {
      customOff.push(ds)
      const i = customWork.indexOf(ds)
      if (i >= 0) customWork.splice(i, 1)
    }
  }

  emit('update', { customOffDays: customOff, customWorkDays: customWork })
}

const stats = computed(() => {
  const days = calendarDays.value.filter(d => d.currentMonth)
  return {
    work:       days.filter(d => d.status === 'work' || d.status === 'custom-work').length,
    off:        days.filter(d => d.status === 'weekly-off' || d.status === 'custom-off').length,
    customOff:  days.filter(d => d.status === 'custom-off').length,
    customWork: days.filter(d => d.status === 'custom-work').length,
  }
})
</script>

<template>
  <div class="space-y-3">

    <!-- Month navigation -->
    <div class="flex items-center justify-between">
      <button
        type="button"
        class="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700
               bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400
               hover:border-primary-400 hover:text-primary-500 transition-colors
               flex items-center justify-center"
        @click="prevMonth"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {{ MONTH_UZ[viewMonth] }} {{ viewYear }}
      </p>

      <button
        type="button"
        class="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700
               bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400
               hover:border-primary-400 hover:text-primary-500 transition-colors
               flex items-center justify-center"
        @click="nextMonth"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- Weekday headers -->
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="(label, i) in SHORT_UZ"
        :key="i"
        class="text-center text-[10px] font-semibold uppercase tracking-widest py-1"
        :class="i >= 5 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'"
      >
        {{ label }}
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="cell in calendarDays"
        :key="cell.date"
        type="button"
        :disabled="!cell.currentMonth"
        :class="[
          'relative aspect-square rounded-lg text-xs font-semibold transition-all flex items-center justify-center select-none',
          !cell.currentMonth
            ? 'opacity-0 pointer-events-none'
            : cell.status === 'custom-work'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
              : cell.status === 'custom-off'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50'
                : cell.status === 'weekly-off'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400',
          cell.isToday ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900' : ''
        ]"
        @click="toggleDay(cell)"
      >
        {{ cell.day }}
        <!-- Custom dot indicator -->
        <span
          v-if="cell.isCustomOff || cell.isCustomWork"
          class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          :class="cell.isCustomOff ? 'bg-red-500' : 'bg-emerald-500'"
        />
      </button>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
        <span class="text-[11px] text-gray-500">Ish kuni</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800" />
        <span class="text-[11px] text-gray-500">Haftalik dam</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700" />
        <span class="text-[11px] text-gray-500">Qo'shimcha dam</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700" />
        <span class="text-[11px] text-gray-500">Override ish kuni</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-2">
      <div class="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
        <p class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ stats.work }}</p>
        <p class="text-[10px] text-gray-400 mt-0.5">Ish</p>
      </div>
      <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-center">
        <p class="text-sm font-bold text-amber-600 dark:text-amber-400">{{ stats.off }}</p>
        <p class="text-[10px] text-amber-500 mt-0.5">Dam</p>
      </div>
      <div class="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
        <p class="text-sm font-bold text-red-600 dark:text-red-400">{{ stats.customOff }}</p>
        <p class="text-[10px] text-red-400 mt-0.5">+Dam</p>
      </div>
      <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
        <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">{{ stats.customWork }}</p>
        <p class="text-[10px] text-emerald-500 mt-0.5">+Ish</p>
      </div>
    </div>

    <p class="text-[11px] text-gray-400 text-center">
      Kunni bosib ish kuni ↔ dam olish kuniga o'zgartiring
    </p>
  </div>
</template>