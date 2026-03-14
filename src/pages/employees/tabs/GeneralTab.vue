<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Edit3, Save, X, Send, CheckCircle, XCircle,
  User, Briefcase, Building2, Calendar, Banknote,
  Clock, Hash, Moon
} from 'lucide-vue-next'
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

const sel = 'w-full px-3 py-2.5 text-sm rounded-xl border border-[#2d3148] bg-[#0f1117] text-gray-100 outline-none focus:border-indigo-500 transition-colors'

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

// Short day labels (2 harf)
const SHORT_LABELS: Record<string, string> = {
  monday: 'Du', tuesday: 'Se', wednesday: 'Ch',
  thursday: 'Pa', friday: 'Ju', saturday: 'Sh', sunday: 'Ya',
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

const effectiveRate = computed(() => {
  const e = props.employee
  if (!e) return 0
  if (e.hourly_rate) return Number(e.hourly_rate)
  return Math.round(Number(e.base_salary) / ((e.work_hours_per_day ?? 8) * 22))
})
</script>

<template>
  <!-- ═══════════════════════════════════════════════════════ VIEW ══ -->
  <template v-if="!editing">
    <div class="space-y-6">

      <!-- Info grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <!-- field card -->
        <div v-for="field in [
          { icon: User,      label: 'To\'liq ism',   value: employee.full_name },
          { icon: Hash,      label: 'Telefon',        value: employee.phone },
          { icon: Briefcase, label: 'Rol',            value: roleLabels[employee.role] ?? employee.role },
          { icon: Briefcase, label: 'Ish turi',       value: empTypeLabels[employee.employment_type] ?? employee.employment_type },
          { icon: User,      label: 'Lavozim',        value: employee.position || '—' },
          { icon: Building2, label: 'Filial',         value: employee.branch?.name ?? '—' },
          { icon: Building2, label: 'Bo\'lim',        value: employee.department?.name ?? '—' },
          { icon: Calendar,  label: 'Ishga kirgan',   value: employee.hire_date ? formatDate(employee.hire_date) : '—' },
        ]" :key="field.label"
          class="flex items-start gap-3 p-3.5 rounded-xl bg-[#0f1117] border border-[#2d3148]"
        >
          <div class="mt-0.5 w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
            <component :is="field.icon" class="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-0.5">{{ field.label }}</p>
            <p class="text-sm font-medium text-gray-100 truncate">{{ field.value }}</p>
          </div>
        </div>

      </div>

      <!-- Maosh qatori -->
      <div class="grid grid-cols-3 gap-3">
        <div class="p-3.5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/20">
          <p class="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">Asosiy maosh</p>
          <p class="text-base font-bold text-gray-100">{{ formatMoney(Number(employee.base_salary)) }}</p>
        </div>
        <div class="p-3.5 rounded-xl bg-[#0f1117] border border-[#2d3148]">
          <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Soatlik</p>
          <p class="text-base font-bold text-gray-100">
            {{ formatMoney(effectiveRate) }}
            <span v-if="!employee.hourly_rate" class="text-[10px] font-normal text-gray-500 ml-1">auto</span>
          </p>
        </div>
        <div class="p-3.5 rounded-xl bg-[#0f1117] border border-[#2d3148]">
          <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Ish soati</p>
          <p class="text-base font-bold text-gray-100">{{ employee.work_hours_per_day ?? 8 }}<span class="text-xs font-normal text-gray-500 ml-1">soat/kun</span></p>
        </div>
      </div>

      <!-- Dam olish kunlari -->
      <div class="p-4 rounded-xl bg-[#0f1117] border border-[#2d3148]">
        <div class="flex items-center gap-2 mb-3">
          <Moon class="w-3.5 h-3.5 text-amber-400" />
          <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Dam olish kunlari</p>
        </div>
        <div class="flex gap-2">
          <div v-for="day in ALL_WEEK_DAYS" :key="day" class="flex-1 text-center">
            <div :class="[
              'py-2 rounded-lg text-xs font-bold transition-all',
              (employee.off_days ?? []).includes(day)
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-[#1a1d27] text-gray-600 border border-[#2d3148]'
            ]">
              {{ SHORT_LABELS[day] }}
            </div>
            <div class="mt-1 text-[9px] text-center" :class="(employee.off_days ?? []).includes(day) ? 'text-amber-500' : 'text-gray-700'">
              {{ (employee.off_days ?? []).includes(day) ? '●' : '○' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Telegram -->
      <div class="flex items-center gap-3 p-3.5 rounded-xl bg-[#0f1117] border border-[#2d3148]">
        <div class="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
          <Send class="w-3.5 h-3.5 text-sky-400" />
        </div>
        <span class="text-xs text-gray-500 font-medium">Telegram</span>
        <template v-if="employee.telegram_user_id">
          <CheckCircle class="w-4 h-4 text-emerald-500" />
          <span class="text-sm font-semibold text-emerald-400">Ulangan</span>
          <code class="ml-auto text-[11px] text-gray-500 bg-[#1a1d27] px-2 py-0.5 rounded-md font-mono">
            {{ employee.telegram_user_id }}
          </code>
        </template>
        <template v-else>
          <XCircle class="w-4 h-4 text-gray-600" />
          <span class="text-sm text-gray-600">Ulanmagan</span>
        </template>
      </div>

      <!-- Edit tugma -->
      <div v-if="canEdit">
        <button
          class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl
                 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20
                 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all"
          @click="startEdit"
        >
          <Edit3 class="w-4 h-4" />
          Tahrirlash
        </button>
      </div>
    </div>
  </template>

  <!-- ═══════════════════════════════════════════════════════ EDIT ══ -->
  <template v-else>
    <div class="space-y-5">

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppInput v-model="form.full_name" label="To'liq ism" />
        <AppInput v-model="form.position"  label="Lavozim" />

        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Rol</label>
          <select v-model="form.role" :class="sel">
            <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Ish turi</label>
          <select v-model="form.employment_type" :class="sel">
            <option v-for="t in empTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Filial</label>
          <select v-model="form.branch_id" :class="sel">
            <option :value="undefined">Tanlang</option>
            <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Bo'lim</label>
          <select v-model="form.department_id" :class="sel">
            <option :value="undefined">Tanlang</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Asosiy maosh</label>
          <input v-model.number="form.base_salary" type="number" min="0" :class="sel" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            Soatlik stavka <span class="text-[10px] text-gray-600 normal-case font-normal">(bo'sh = auto)</span>
          </label>
          <input v-model.number="form.hourly_rate" type="number" min="0" placeholder="Auto" :class="sel" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Kunlik ish soati</label>
          <input v-model.number="form.work_hours_per_day" type="number" min="1" max="24" :class="sel" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Ishga kirgan sana</label>
          <input v-model="form.hire_date" type="date" :class="sel" />
        </div>

        <AppInput v-model="form.telegram_user_id" label="Telegram ID" />

        <!-- Dam olish kunlari toggle -->
        <div class="sm:col-span-2">
          <label class="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            <Moon class="w-3.5 h-3.5 text-amber-400" />
            Dam olish kunlari
          </label>
          <div class="flex gap-2">
            <button v-for="day in ALL_WEEK_DAYS" :key="day" type="button"
              class="flex-1 py-3 rounded-xl text-xs font-bold transition-all border"
              :class="(form.off_days ?? []).includes(day)
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'bg-[#0f1117] text-gray-600 border-[#2d3148] hover:border-gray-500 hover:text-gray-400'"
              @click="toggleOffDay(day)"
            >
              {{ SHORT_LABELS[day] }}
            </button>
          </div>
          <p class="text-[11px] text-gray-600 mt-2">
            Tanlangan: {{ (form.off_days ?? []).map(d => WEEK_DAY_LABELS[d]).join(', ') || '—' }}
          </p>
        </div>

        <!-- Faol -->
        <div class="flex items-center gap-3 p-3 rounded-xl bg-[#0f1117] border border-[#2d3148]">
          <button type="button"
            :class="['relative w-10 h-5 rounded-full transition-colors',
              form.is_active ? 'bg-emerald-500' : 'bg-gray-700']"
            @click="form.is_active = !form.is_active"
          >
            <span :class="['absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              form.is_active ? 'translate-x-5' : 'translate-x-0.5']" />
          </button>
          <label class="text-sm text-gray-300 font-medium select-none cursor-pointer" @click="form.is_active = !form.is_active">
            {{ form.is_active ? 'Faol xodim' : 'Nofaol xodim' }}
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-4 border-t border-[#2d3148]">
        <button
          class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl
                 bg-[#0f1117] text-gray-400 border border-[#2d3148]
                 hover:bg-[#1a1d27] transition-all"
          @click="cancelEdit"
        >
          <X class="w-4 h-4" />
          Bekor
        </button>
        <button
          :disabled="saving"
          class="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl
                 bg-indigo-500 text-white hover:bg-indigo-600
                 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          @click="onSave"
        >
          <Save class="w-4 h-4" />
          {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
      </div>
    </div>
  </template>
</template>