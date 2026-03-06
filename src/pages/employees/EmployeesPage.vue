<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Eye, Pencil, Trash2, X } from 'lucide-vue-next'
import { useEmployeeStore } from '@/stores/employees'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import { usePermission } from '@/composables/usePermission'
import AppTable, { type TableColumn } from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { formatMoney } from '@/utils/format'
import type { BranchOut, DepartmentOut, EmployeeCreate, UserRole, EmploymentType } from '@/types'
import api from '@/composables/useApi'

const store         = useEmployeeStore()
const toast         = useToastStore()
const router        = useRouter()
const { confirm }   = useConfirm()
const { can }       = usePermission()

const branches    = ref<BranchOut[]>([])
const departments = ref<DepartmentOut[]>([])

async function loadMeta() {
  const [b, d] = await Promise.allSettled([
    api.get('/api/branches',    { params: { size: 100, page: 1 } }),
    api.get('/api/departments', { params: { size: 100, page: 1 } }),
  ])
  if (b.status === 'fulfilled') branches.value    = b.value.data.items ?? []
  if (d.status === 'fulfilled') departments.value = d.value.data.items ?? []
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch(val: string) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => store.setFilters({ search: val }), 400)
}

const columns: TableColumn[] = [
  { key: 'full_name',     label: 'F.I.O',     sortable: true, mobileTitle: true },
  { key: 'branch',        label: 'Filial' },
  { key: 'department',    label: "Bo'lim" },
  { key: 'position',      label: 'Lavozim' },
  { key: 'base_salary',   label: 'Maosh',     sortable: true },
  { key: 'is_active',     label: 'Status' },
  { key: 'actions',       label: 'Amallar',   mobileHide: true, width: '120px' },
]

const totalPages = computed(() => Math.ceil(store.total / store.size))

const showAdd    = ref(false)
const addLoading = ref(false)

const emptyForm = (): EmployeeCreate => ({
  phone:            '',
  full_name:        '',
  password:         '',
  role:             'employee',
  branch_id:        undefined,
  department_id:    undefined,
  position:         '',
  employment_type:  'full_time',
  hire_date:        '',
  base_salary:      0,
  telegram_user_id: '',
})

const form    = ref<EmployeeCreate>(emptyForm())
const fErrors = ref<Partial<Record<keyof EmployeeCreate, string>>>({})

function validateForm() {
  fErrors.value = {}
  let ok = true
  if (!form.value.phone)     { fErrors.value.phone     = 'Telefon kiritilishi shart'; ok = false }
  if (!form.value.full_name) { fErrors.value.full_name = 'F.I.O kiritilishi shart';   ok = false }
  if (!form.value.password)  { fErrors.value.password  = 'Parol kiritilishi shart';   ok = false }
  return ok
}

async function onAdd() {
  if (!validateForm()) return
  addLoading.value = true
  try {
    const payload = { ...form.value }
    if (!payload.branch_id)        delete payload.branch_id
    if (!payload.department_id)    delete payload.department_id
    if (!payload.hire_date)        delete payload.hire_date
    if (!payload.telegram_user_id) delete payload.telegram_user_id
    await store.create(payload)
    toast.success("Xodim qo'shildi")
    showAdd.value = false
    form.value    = emptyForm()
  } catch (_) {
    toast.error("Xodim qo'shishda xatolik")
  } finally {
    addLoading.value = false
  }
}

async function onDelete(id: number, name: string) {
  const ok = await confirm({
    title:   "Xodimni o'chirish",
    message: `"${name}" ni o'chirishni tasdiqlaysizmi?`,
    type:    'danger',
  })
  if (!ok) return
  try {
    await store.remove(id)
    toast.success("Xodim o'chirildi")
  } catch (_) {
    toast.error("O'chirishda xatolik")
  }
}

const roles: { value: UserRole; label: string }[] = [
  { value: 'employee',       label: 'Xodim'         },
  { value: 'hr_manager',     label: 'HR Menejer'     },
  { value: 'branch_manager', label: 'Filial Menejer' },
  { value: 'accountant',     label: 'Buxgalter'      },
  { value: 'admin',          label: 'Admin'          },
]

const employmentTypes: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: "To'liq stavka" },
  { value: 'part_time', label: 'Yarim stavka'  },
  { value: 'contract',  label: 'Kontrakt'      },
  { value: 'intern',    label: 'Intern'        },
]

onMounted(async () => {
  await Promise.all([store.fetchAll(), loadMeta()])
})
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Xodimlar</h1>
        <p class="text-sm text-gray-400 mt-0.5">Jami {{ store.total }} ta xodim</p>
      </div>
      <AppButton v-if="can('employees')" variant="primary" @click="showAdd = true">
        <component :is="Plus" class="w-4 h-4" />
        Qo'shish
      </AppButton>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-wrap gap-3">

        <div class="relative flex-1 min-w-[200px]">
          <component :is="Search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            :value="store.filters.search"
            type="text"
            placeholder="Qidirish..."
            class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-primary-500 transition-colors"
            @input="onSearch(($event.target as HTMLInputElement).value)"
          />
        </div>

        <select
          :value="store.filters.branch_id"
          class="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1117] text-gray-700 dark:text-gray-300 outline-none focus:border-primary-500 transition-colors"
          @change="store.setFilters({ branch_id: ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : undefined })"
        >
          <option value="">Barcha filiallar</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>

        <select
          :value="store.filters.department_id"
          class="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1117] text-gray-700 dark:text-gray-300 outline-none focus:border-primary-500 transition-colors"
          @change="store.setFilters({ department_id: ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : undefined })"
        >
          <option value="">Barcha bo'limlar</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>

        <select
          class="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1117] text-gray-700 dark:text-gray-300 outline-none focus:border-primary-500 transition-colors"
          @change="store.setFilters({ is_active: ($event.target as HTMLSelectElement).value === '' ? undefined : ($event.target as HTMLSelectElement).value === 'true' })"
        >
          <option value="">Barcha statuslar</option>
          <option value="true">Faol</option>
          <option value="false">Nofaol</option>
        </select>

        <AppButton variant="ghost" size="sm" @click="store.resetFilters">
          <component :is="X" class="w-4 h-4" />
        </AppButton>
      </div>
    </div>

    <!-- Table -->
    <AppTable
      :columns="columns"
      :rows="store.items"
      :loading="store.loading"
      row-key="id"
      empty-text="Xodimlar topilmadi"
    >
      <template #cell-full_name="{ row }">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
            <span class="text-primary-500 text-xs font-semibold">
              {{ String(row.full_name ?? '').slice(0, 2).toUpperCase() }}
            </span>
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100 text-sm">{{ row.full_name }}</p>
            <p class="text-xs text-gray-400">{{ row.phone }}</p>
          </div>
        </div>
      </template>

      <template #cell-branch="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-300">
          {{ row.branch?.name ?? '—' }}
        </span>
      </template>

      <template #cell-department="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-300">
          {{ row.department?.name ?? '—' }}
        </span>
      </template>

      <template #cell-position="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-300">
          {{ row.position ?? '—' }}
        </span>
      </template>

      <template #cell-base_salary="{ row }">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ formatMoney(Number(row.base_salary)) }}
        </span>
      </template>

      <template #cell-is_active="{ row }">
        <AppBadge :variant="row.is_active ? 'active' : 'inactive'" />
      </template>

      <template #cell-actions="{ row }">
        <div class="flex items-center gap-1">
          <AppButton variant="ghost" size="sm" icon-only tooltip="Ko'rish"
            @click="router.push(`/employees/${row.id}`)">
            <component :is="Eye" class="w-4 h-4" />
          </AppButton>
          <AppButton v-if="can('employees')" variant="ghost" size="sm" icon-only tooltip="Tahrirlash"
            @click="router.push(`/employees/${row.id}`)">
            <component :is="Pencil" class="w-4 h-4" />
          </AppButton>
          <AppButton v-if="can('employees')" variant="ghost" size="sm" icon-only tooltip="O'chirish"
            @click="onDelete(row.id, row.full_name)">
            <component :is="Trash2" class="w-4 h-4 text-red-400" />
          </AppButton>
        </div>
      </template>

      <template #mobile-status="{ row }">
        <AppBadge :variant="row.is_active ? 'active' : 'inactive'" size="sm" />
      </template>

      <template #mobile-actions="{ row }">
        <div class="flex gap-2">
          <AppButton variant="outline" size="sm" class="flex-1 justify-center"
            @click="router.push(`/employees/${row.id}`)">
            <component :is="Eye" class="w-3.5 h-3.5" />
            Ko'rish
          </AppButton>
          <AppButton v-if="can('employees')" variant="danger" size="sm" icon-only
            @click="onDelete(row.id, row.full_name)">
            <component :is="Trash2" class="w-3.5 h-3.5" />
          </AppButton>
        </div>
      </template>
    </AppTable>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-gray-400">
        {{ (store.page - 1) * store.size + 1 }}–{{ Math.min(store.page * store.size, store.total) }} / {{ store.total }}
      </p>
      <div class="flex items-center gap-1">
        <AppButton variant="outline" size="sm" :disabled="store.page === 1"
          @click="store.setPage(store.page - 1)">←</AppButton>
        <template v-for="p in totalPages" :key="p">
          <AppButton
            v-if="Math.abs(p - store.page) <= 2"
            :variant="p === store.page ? 'primary' : 'outline'"
            size="sm"
            @click="store.setPage(p)"
          >{{ p }}</AppButton>
        </template>
        <AppButton variant="outline" size="sm" :disabled="store.page === totalPages"
          @click="store.setPage(store.page + 1)">→</AppButton>
      </div>
    </div>

    <!-- Add Employee Modal -->
    <AppModal v-model="showAdd" title="Yangi xodim qo'shish" size="lg" persistent>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <AppInput
          v-model="form.full_name"
          label="F.I.O"
          required
          :hint="fErrors.full_name"
          :state="fErrors.full_name ? 'error' : 'default'"
        />
        <AppInput
          v-model="form.phone"
          label="Telefon"
          type="tel"
          required
          :hint="fErrors.phone"
          :state="fErrors.phone ? 'error' : 'default'"
        />
        <AppInput
          v-model="form.password"
          label="Parol"
          type="password"
          required
          :hint="fErrors.password"
          :state="fErrors.password ? 'error' : 'default'"
        />
        <AppInput v-model="form.position" label="Lavozim" />

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rol</label>
          <select v-model="form.role"
            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500">
            <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ish turi</label>
          <select v-model="form.employment_type"
            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500">
            <option v-for="t in employmentTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Filial</label>
          <select v-model="form.branch_id"
            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500">
            <option :value="undefined">Tanlang</option>
            <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bo'lim</label>
          <select v-model="form.department_id"
            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500">
            <option :value="undefined">Tanlang</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Asosiy maosh</label>
          <input
            :value="form.base_salary"
            type="number"
            min="0"
            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
            @input="form.base_salary = Number(($event.target as HTMLInputElement).value)"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ishga kirgan sana</label>
          <input v-model="form.hire_date" type="date"
            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
          />
        </div>

        <AppInput
          v-model="form.telegram_user_id"
          label="Telegram ID"
          class="sm:col-span-2"
        />
      </div>

      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showAdd = false">Bekor qilish</AppButton>
          <AppButton variant="primary" :loading="addLoading" @click="onAdd">Saqlash</AppButton>
        </div>
      </template>
    </AppModal>

  </div>
</template>