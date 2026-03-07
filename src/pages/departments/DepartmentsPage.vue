<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Search, Pencil, Trash2, FolderOpen } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import { usePermission } from '@/composables/usePermission'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable, { type TableColumn } from '@/components/ui/AppTable.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/composables/useApi'
import type { DepartmentOut, DepartmentCreate, BranchOut } from '@/types'

const toast           = useToastStore()
const { confirm }     = useConfirm()
const { can, isRole } = usePermission()

// ── State ──────────────────────────────────────────────────────────────────
const departments = ref<DepartmentOut[]>([])
const branches    = ref<BranchOut[]>([])
const total       = ref(0)
const page        = ref(1)
const size        = ref(20)
const search      = ref('')
const filterBranch = ref<number | ''>('')
const loading     = ref(false)

const totalPages = computed(() => Math.ceil(total.value / size.value))

const columns: TableColumn[] = [
  { key: 'name',      label: 'Bo\'lim nomi',  sortable: true, mobileTitle: true },
  { key: 'branch',    label: 'Filial' },
  { key: 'is_active', label: 'Status' },
  { key: 'actions',   label: 'Amallar', mobileHide: true, width: '100px' },
]

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchDepartments() {
  loading.value = true
  try {
    const { data } = await api.get('/api/departments', {
      params: {
        page:      page.value,
        size:      size.value,
        search:    search.value || undefined,
        branch_id: filterBranch.value || undefined,
      },
    })
    departments.value = data.items ?? []
    total.value       = data.total ?? 0
  } finally {
    loading.value = false
  }
}

async function fetchBranches() {
  const { data } = await api.get('/api/branches', { params: { page: 1, size: 100 } })
  branches.value = data.items ?? []
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch(val: string) {
  search.value = val
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchDepartments() }, 400)
}

function onBranchFilter(val: string) {
  filterBranch.value = val ? Number(val) : ''
  page.value = 1
  fetchDepartments()
}

function changePage(p: number) {
  page.value = p
  fetchDepartments()
}

onMounted(async () => {
  await Promise.all([fetchDepartments(), fetchBranches()])
})

// ── Add / Edit Modal ───────────────────────────────────────────────────────
const showModal = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const saving    = ref(false)
const editId    = ref<number | null>(null)

const emptyForm = (): DepartmentCreate => ({
  name:      '',
  branch_id: undefined as any,
  head_id:   undefined,
  is_active: true,
})

const form    = ref<DepartmentCreate>(emptyForm())
const fErrors = ref<Partial<Record<keyof DepartmentCreate, string>>>({})

function openAdd() {
  modalMode.value = 'add'
  editId.value    = null
  form.value      = emptyForm()
  fErrors.value   = {}
  showModal.value = true
}

function openEdit(dept: DepartmentOut) {
  modalMode.value = 'edit'
  editId.value    = dept.id
  form.value      = {
    name:      dept.name,
    branch_id: dept.branch_id,
    head_id:   dept.head_id ?? undefined,
    is_active: dept.is_active,
  }
  fErrors.value   = {}
  showModal.value = true
}

function validate() {
  fErrors.value = {}
  let ok = true
  if (!form.value.name)      { fErrors.value.name      = 'Nomi kiritilishi shart';   ok = false }
  if (!form.value.branch_id) { fErrors.value.branch_id = 'Filial tanlanishi shart';  ok = false }
  return ok
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    if (modalMode.value === 'add') {
      await api.post('/api/departments', form.value)
      toast.success('Bo\'lim qo\'shildi')
    } else {
      await api.patch(`/api/departments/${editId.value}`, form.value)
      toast.success('Bo\'lim yangilandi')
    }
    showModal.value = false
    fetchDepartments()
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
async function deleteDept(dept: DepartmentOut) {
  const ok = await confirm({
    title:   'Bo\'limni o\'chirish',
    message: `"${dept.name}" bo\'limni o\'chirishni tasdiqlaysizmi?`,
    type:    'danger',
  })
  if (!ok) return
  await api.delete(`/api/departments/${dept.id}`)
  toast.success('Bo\'lim o\'chirildi')
  fetchDepartments()
}

function getBranchName(branchId: number) {
  return branches.value.find(b => b.id === branchId)?.name ?? '—'
}
</script>

<template>
  <div>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Bo'limlar</h1>
        <p class="text-sm text-gray-400 mt-0.5">Jami {{ total }} ta bo'lim</p>
      </div>
      <AppButton
        v-if="isRole('superadmin', 'admin')"
        variant="primary"
        @click="openAdd"
      >
        <Plus class="w-4 h-4" />
        Bo'lim qo'shish
      </AppButton>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="flex-1 max-w-sm">
        <AppInput
          :model-value="search"
          placeholder="Bo'lim nomi bo'yicha qidirish..."
          clearable
          @update:model-value="onSearch"
        >
          <template #prefix><Search class="w-4 h-4 text-gray-400" /></template>
        </AppInput>
      </div>

      <select
        :value="filterBranch"
        class="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1d27] text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        @change="onBranchFilter(($event.target as HTMLSelectElement).value)"
      >
        <option value="">Barcha filiallar</option>
        <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
    </div>

    <!-- Table -->
    <AppTable
      :columns="columns"
      :rows="departments"
      :loading="loading"
      empty-text="Bo'limlar topilmadi"
    >
      <template #cell-name="{ row }">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <FolderOpen class="w-3.5 h-3.5 text-primary-500" />
          </div>
          <span class="font-medium text-gray-800 dark:text-gray-200">{{ row.name }}</span>
        </div>
      </template>

      <template #cell-branch="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ getBranchName(row.branch_id) }}</span>
      </template>

      <template #cell-is_active="{ row }">
        <AppBadge :variant="row.is_active ? 'active' : 'inactive'" size="sm" />
      </template>

      <template #cell-actions="{ row }">
        <div v-if="isRole('superadmin', 'admin')" class="flex items-center gap-1">
          <button
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500 transition-colors"
            @click="openEdit(row)"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
            @click="deleteDept(row)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </template>
    </AppTable>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <AppButton variant="ghost" size="sm" :disabled="page === 1" @click="changePage(page - 1)">←</AppButton>
      <span class="text-sm text-gray-500">{{ page }} / {{ totalPages }}</span>
      <AppButton variant="ghost" size="sm" :disabled="page === totalPages" @click="changePage(page + 1)">→</AppButton>
    </div>

  </div>

  <!-- Add / Edit Modal -->
  <AppModal
    v-model="showModal"
    :title="modalMode === 'add' ? 'Bo\'lim qo\'shish' : 'Bo\'limni tahrirlash'"
  >
    <div class="space-y-4">
      <AppInput
        v-model="form.name"
        label="Bo'lim nomi"
        placeholder="Masalan: Moliya bo'limi"
        :error="fErrors.name"
        required
      />

      <div class="space-y-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filial <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.branch_id"
          :class="[
            'w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30',
            fErrors.branch_id
              ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1d27] text-gray-700 dark:text-gray-300',
          ]"
        >
          <option :value="undefined">Filial tanlang</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <p v-if="fErrors.branch_id" class="text-xs text-red-500">{{ fErrors.branch_id }}</p>
      </div>

      <!-- is_active toggle -->
      <div class="flex items-center justify-between py-2">
        <div>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Faol holat</p>
          <p class="text-xs text-gray-400">Bo'lim faol yoki yopiq</p>
        </div>
        <button
          type="button"
          :class="[
            'relative w-11 h-6 rounded-full transition-colors duration-200',
            form.is_active ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700',
          ]"
          @click="form.is_active = !form.is_active"
        >
          <span
            :class="[
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
              form.is_active ? 'translate-x-5' : 'translate-x-0',
            ]"
          />
        </button>
      </div>
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="showModal = false">Bekor qilish</AppButton>
      <AppButton variant="primary" :loading="saving" @click="save">
        {{ modalMode === 'add' ? 'Qo\'shish' : 'Saqlash' }}
      </AppButton>
    </template>
  </AppModal>
  </div>
</template>