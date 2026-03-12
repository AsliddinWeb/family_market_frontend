<script setup lang="ts">
import { ref, computed } from 'vue'
import { Send, CheckCircle, XCircle } from 'lucide-vue-next'
import AppInput from '@/components/ui/AppInput.vue'
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

const sel = 'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500'

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
    work_hours_per_day: e.work_hours_per_day ?? 8,
    off_days:           [...(e.off_days ?? ['saturday', 'sunday'])],
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

function onSave() {
  const p: EmployeeUpdate = { ...form.value }
  if (!p.hire_date)        delete p.hire_date
  if (!p.telegram_user_id) delete p.telegram_user_id
  if (!p.position)         delete p.position
  if (!p.hourly_rate)      delete p.hourly_rate
  emit('save', p)
  editing.value = false
}
</script>

<template>
  <div>
    <!-- VIEW -->
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
        <button class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-400 hover:text-primary-500 transition-colors"
          @click="startEdit">Tahrirlash</button>
      </div>
    </template>

    <!-- EDIT -->
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

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kunlik ish soati</label>
          <input v-model.number="form.work_hours_per_day" type="number" min="1" max="24" :class="sel" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ishga kirgan sana</label>
          <input v-model="form.hire_date" type="date" :class="sel" />
        </div>

        <AppInput v-model="form.telegram_user_id" label="Telegram ID" />

        <!-- Dam olish kunlari -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dam olish kunlari</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="day in ALL_WEEK_DAYS" :key="day" type="button"
              :class="['px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                (form.off_days ?? []).includes(day)
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'bg-white dark:bg-[#0f1117] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-400']"
              @click="toggleOffDay(day)">
              {{ WEEK_DAY_LABELS[day] }}
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <input v-model="form.is_active" type="checkbox" id="tab_is_active" class="w-4 h-4 rounded text-primary-500" />
          <label for="tab_is_active" class="text-sm text-gray-700 dark:text-gray-300">Faol xodim</label>
        </div>
      </div>

      <div class="flex gap-2 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
        <button class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          @click="cancelEdit">Bekor</button>
        <button :disabled="saving"
          class="px-4 py-2 text-sm font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
          @click="onSave">{{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}</button>
      </div>
    </template>
  </div>
</template>