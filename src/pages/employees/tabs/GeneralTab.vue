<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Send, CheckCircle, XCircle } from 'lucide-vue-next'
import AppInput from '@/components/ui/AppInput.vue'
import OffDaysCalendar from './OffDaysCalendar.vue'
import { formatDate, formatMoney } from '@/utils/format'
import type { EmployeeOut, EmployeeUpdate, BranchOut, DepartmentOut, UserRole, EmploymentType, WeekDay } from '@/types'
import { ALL_WEEK_DAYS, WEEK_DAY_LABELS } from '@/types'

const props = defineProps<{
  employee: EmployeeOut
  branches: BranchOut[]
  departments: DepartmentOut[]
  canEdit: boolean
  saving: boolean
}>()

const emit = defineEmits<{ save: [payload: EmployeeUpdate] }>()

const editing = ref(false)
const form    = ref<EmployeeUpdate>({})

const sel = 'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 transition-colors'

const roleLabels: Record<string, string> = {
  employee: 'Xodim', hr_manager: 'HR Menejer',
  branch_manager: 'Filial Menejer', accountant: 'Buxgalter',
  admin: 'Admin', superadmin: 'Superadmin',
}
const empTypeLabels: Record<string, string> = {
  full: "To'liq stavka", part: 'Yarim stavka', contract: 'Kontrakt',
}
const roles: { value: UserRole; label: string }[] = [
  { value: 'employee',       label: 'Xodim'          },
  { value: 'hr_manager',     label: 'HR Menejer'     },
  { value: 'branch_manager', label: 'Filial Menejer' },
  { value: 'accountant',     label: 'Buxgalter'      },
  { value: 'admin',          label: 'Admin'           },
]
const empTypes: { value: EmploymentType; label: string }[] = [
  { value: 'full',     label: "To'liq stavka" },
  { value: 'part',     label: 'Yarim stavka'  },
  { value: 'contract', label: 'Kontrakt'      },
]

// "09:00:00" → "09:00"
function toTimeInput(val: string | null | undefined): string {
  if (!val) return ''
  return val.slice(0, 5)
}

function startEdit() {
  const e = props.employee
  form.value = {
    full_name:          e.full_name,
    role:               e.role,
    branch_id:          e.branch_id ?? undefined,
    department_id:      e.department_id ?? undefined,
    position:           e.position ?? '',
    employment_type:    e.employment_type,
    hire_date:          e.hire_date ?? '',
    base_salary:        Number(e.base_salary),
    hourly_rate:        e.hourly_rate ? Number(e.hourly_rate) : null,
    work_start_time:    toTimeInput(e.work_start_time) || null,
    work_end_time:      toTimeInput(e.work_end_time) || null,
    work_hours_per_day: e.work_hours_per_day ?? 8,
    off_days:           [...(e.off_days ?? ['saturday', 'sunday'])],
    custom_off_days:    [...(e.custom_off_days ?? [])],
    custom_work_days:   [...(e.custom_work_days ?? [])],
    telegram_user_id:   e.telegram_user_id ?? '',
    is_active:          e.is_active,
  }
  editing.value = true
}

function cancelEdit() { editing.value = false }

function toggleOffDay(day: WeekDay) {
  const days = [...(form.value.off_days ?? [])]
  const idx  = days.indexOf(day)
  if (idx >= 0) days.splice(idx, 1)
  else days.push(day)
  form.value.off_days = days
}

function onCalendarUpdate(payload: { customOffDays: string[]; customWorkDays: string[] }) {
  form.value.custom_off_days  = payload.customOffDays
  form.value.custom_work_days = payload.customWorkDays
}

function onSave() {
  const p: EmployeeUpdate = { ...form.value }
  if (!p.hire_date)        delete p.hire_date
  if (!p.telegram_user_id) delete p.telegram_user_id
  if (!p.position)         delete p.position
  if (!p.hourly_rate)      delete p.hourly_rate
  // Bo'sh qoldirilsa null yuboriladi — filial vaqtiga qaytish
  if (!p.work_start_time)  p.work_start_time = null
  if (!p.work_end_time)    p.work_end_time = null
  emit('save', p)
  editing.value = false
}

// Kelish/ketish vaqtidan kunlik ish soatini hisoblash
const computedWorkHours = computed(() => {
  const start = form.value.work_start_time
  const end   = form.value.work_end_time
  if (!start || !end) return null
  const sp = start.split(':').map(Number)
  const ep = end.split(':').map(Number)
  const sh = sp[0] ?? 0, sm = sp[1] ?? 0
  const eh = ep[0] ?? 0, em = ep[1] ?? 0
  const totalMins = (eh * 60 + em) - (sh * 60 + sm)
  if (totalMins <= 0) return null
  return Math.round(totalMins / 60 * 10) / 10  // 1 decimal
})

// Vaqt o'zgarganda work_hours_per_day ni auto update
watch(() => [form.value.work_start_time, form.value.work_end_time], () => {
  if (computedWorkHours.value !== null) {
    form.value.work_hours_per_day = Math.round(computedWorkHours.value)
  }
})

const effectiveRate = computed(() => {
  const e = props.employee
  if (!e) return 0
  if (e.hourly_rate) return Number(e.hourly_rate)
  return Math.round(Number(e.base_salary) / ((e.work_hours_per_day ?? 8) * 22))
})

// Ko'rsatish uchun — xodim vaqti yoki filial vaqti
const displayWorkStart = computed(() => {
  const e = props.employee
  if (e.work_start_time) return e.work_start_time.slice(0, 5)
  const t = (e.branch as any)?.work_start_time
  return t ? `${t.slice(0, 5)} (filial)` : '—'
})

const displayWorkEnd = computed(() => {
  const e = props.employee
  if (e.work_end_time) return e.work_end_time.slice(0, 5)
  const t = (e.branch as any)?.work_end_time
  return t ? `${t.slice(0, 5)} (filial)` : '—'
})
</script>

<template>
  <div>
    <!-- ══════════════════════════════════════════ VIEW ══ -->
    <template v-if="!editing">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">To'liq ism</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ employee.full_name }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Telefon</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ employee.phone }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Rol</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ roleLabels[employee.role] ?? employee.role }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Ish turi</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ empTypeLabels[employee.employment_type] ?? employee.employment_type }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Lavozim</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ employee.position || '—' }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Filial</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ employee.branch?.name ?? '—' }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Bo'lim</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ employee.department?.name ?? '—' }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Ishga kirgan</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ employee.hire_date ? formatDate(employee.hire_date) : '—' }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Asosiy maosh</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ formatMoney(Number(employee.base_salary)) }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Soatlik stavka</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
            {{ formatMoney(effectiveRate) }}
            <span v-if="!employee.hourly_rate" class="text-xs font-normal text-gray-400">(auto)</span>
          </p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Kunlik ish soati</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ employee.work_hours_per_day ?? 8 }} soat</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Kelish vaqti</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200 font-mono">{{ displayWorkStart }}</p>
        </div>

        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Ketish vaqti</p>
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200 font-mono">{{ displayWorkEnd }}</p>
        </div>

      </div>

      <!-- Haftalik dam olish -->
      <div class="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-2">Haftalik dam olish</p>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="day in ALL_WEEK_DAYS" :key="day"
            :class="['px-2.5 py-1 text-xs rounded-lg font-medium',
              (employee.off_days ?? []).includes(day)
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400']">
            {{ WEEK_DAY_LABELS[day] }}
          </span>
        </div>
      </div>

      <!-- Aniq sana o'zgarishlar -->
      <div
        v-if="(employee.custom_off_days?.length || employee.custom_work_days?.length)"
        class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
      >
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-2">Aniq sana o'zgarishlar</p>
        <div v-if="employee.custom_off_days?.length" class="flex flex-wrap gap-1.5 mb-2">
          <span class="text-xs text-red-500 font-medium">Qo'shimcha dam:</span>
          <span v-for="d in employee.custom_off_days" :key="d"
            class="text-xs px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-mono">
            {{ d }}
          </span>
        </div>
        <div v-if="employee.custom_work_days?.length" class="flex flex-wrap gap-1.5">
          <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Override ish kuni:</span>
          <span v-for="d in employee.custom_work_days" :key="d"
            class="text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-mono">
            {{ d }}
          </span>
        </div>
      </div>

      <!-- Telegram -->
      <div class="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <component :is="Send" class="w-4 h-4 text-gray-400" />
        <span class="text-sm text-gray-500">Telegram:</span>
        <template v-if="employee.telegram_user_id">
          <component :is="CheckCircle" class="w-4 h-4 text-green-500" />
          <span class="text-sm text-green-600 dark:text-green-400 font-medium">Ulangan</span>
          <span class="text-xs text-gray-400 font-mono">{{ employee.telegram_user_id }}</span>
        </template>
        <template v-else>
          <component :is="XCircle" class="w-4 h-4 text-gray-400" />
          <span class="text-sm text-gray-400">Ulanmagan</span>
        </template>
      </div>

      <div v-if="canEdit" class="mt-5">
        <button
          class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700
                 text-gray-700 dark:text-gray-300 hover:border-primary-400 hover:text-primary-500 transition-colors"
          @click="startEdit"
        >
          Tahrirlash
        </button>
      </div>
    </template>

    <!-- ══════════════════════════════════════════ EDIT ══ -->
    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <AppInput v-model="form.full_name" label="To'liq ism" />
        <AppInput v-model="form.position"  label="Lavozim" />

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rol</label>
          <select v-model="form.role" :class="sel">
            <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ish turi</label>
          <select v-model="form.employment_type" :class="sel">
            <option v-for="t in empTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Filial</label>
          <select v-model="form.branch_id" :class="sel">
            <option :value="undefined">Tanlang</option>
            <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bo'lim</label>
          <select v-model="form.department_id" :class="sel">
            <option :value="undefined">Tanlang</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Asosiy maosh</label>
          <input v-model.number="form.base_salary" type="number" min="0" :class="sel" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Soatlik stavka <span class="text-xs text-gray-400 font-normal">(ixtiyoriy)</span>
          </label>
          <input v-model.number="form.hourly_rate" type="number" min="0" placeholder="Bo'sh = auto" :class="sel" />
        </div>

        <!-- Kelish / Ketish vaqti -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Kelish vaqti
            <span class="text-xs text-gray-400 font-normal">(bo'sh = filial vaqti)</span>
          </label>
          <input v-model="form.work_start_time" type="time" :class="sel" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Ketish vaqti
            <span class="text-xs text-gray-400 font-normal">(bo'sh = filial vaqti)</span>
          </label>
          <input v-model="form.work_end_time" type="time" :class="sel" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Kunlik ish soati
            <span class="text-xs text-gray-400 font-normal">(kelish/ketish vaqtidan auto)</span>
          </label>
          <div :class="sel + ' bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-default'">
            {{ computedWorkHours !== null ? computedWorkHours + ' soat' : (form.work_hours_per_day ?? 8) + ' soat' }}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ishga kirgan sana</label>
          <input v-model="form.hire_date" type="date" :class="sel" />
        </div>

        <AppInput v-model="form.telegram_user_id" label="Telegram ID" />

        <!-- Haftalik dam olish -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Haftalik dam olish (default pattern)
          </label>
          <div class="flex flex-wrap gap-2">
            <button v-for="day in ALL_WEEK_DAYS" :key="day" type="button"
              :class="['px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                (form.off_days ?? []).includes(day)
                  ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                  : 'bg-white dark:bg-[#0f1117] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-400']"
              @click="toggleOffDay(day)">
              {{ WEEK_DAY_LABELS[day] }}
            </button>
          </div>
        </div>

        <!-- Taqvim -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Aniq kunlar bo'yicha sozlash
          </label>
          <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <OffDaysCalendar
              :off-days="form.off_days ?? []"
              :custom-off-days="form.custom_off_days ?? []"
              :custom-work-days="form.custom_work_days ?? []"
              @update="onCalendarUpdate"
            />
          </div>
        </div>

        <!-- Faol -->
        <div class="flex items-center gap-3">
          <input v-model="form.is_active" type="checkbox" id="tab_is_active" class="w-4 h-4 rounded text-primary-500" />
          <label for="tab_is_active" class="text-sm text-gray-700 dark:text-gray-300">Faol xodim</label>
        </div>

      </div>

      <div class="flex gap-2 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
        <button
          class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700
                 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          @click="cancelEdit"
        >
          Bekor
        </button>
        <button
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium rounded-lg bg-primary-500 text-white
                 hover:bg-primary-600 disabled:opacity-60"
          @click="onSave"
        >
          {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
      </div>
    </template>
  </div>
</template>