<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Search, Pencil, Trash2, Building2, MapPin, Phone, Clock, Users } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import { usePermission } from '@/composables/usePermission'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/composables/useApi'
import type { BranchOut, BranchCreate } from '@/types'

const toast          = useToastStore()
const { confirm }    = useConfirm()
const { can, isRole } = usePermission()

// ── State ──────────────────────────────────────────────────────────────────
const branches  = ref<BranchOut[]>([])
const total     = ref(0)
const page      = ref(1)
const size      = ref(20)
const search    = ref('')
const loading   = ref(false)

const totalPages = computed(() => Math.ceil(total.value / size.value))

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchBranches() {
  loading.value = true
  try {
    const { data } = await api.get('/api/branches', {
      params: { page: page.value, size: size.value, search: search.value || undefined },
    })
    branches.value = data.items ?? []
    total.value    = data.total ?? 0
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch(val: string) {
  search.value = val
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchBranches() }, 400)
}

function changePage(p: number) {
  page.value = p
  fetchBranches()
}

onMounted(fetchBranches)

// ── Add / Edit Modal ───────────────────────────────────────────────────────
const showModal  = ref(false)
const modalMode  = ref<'add' | 'edit'>('add')
const saving     = ref(false)
const editId     = ref<number | null>(null)

const emptyForm = (): BranchCreate => ({
  name:            '',
  address:         '',
  phone:           '',
  manager_id:      undefined,
  work_start_time: '09:00',
  is_active:       true,
})

const form   = ref<BranchCreate>(emptyForm())
const fErrors = ref<Partial<Record<keyof BranchCreate, string>>>({})

function openAdd() {
  modalMode.value = 'add'
  editId.value    = null
  form.value      = emptyForm()
  fErrors.value   = {}
  showModal.value = true
}

function openEdit(branch: BranchOut) {
  modalMode.value          = 'edit'
  editId.value             = branch.id
  form.value               = {
    name:            branch.name,
    address:         branch.address ?? '',
    phone:           branch.phone ?? '',
    manager_id:      branch.manager_id ?? undefined,
    work_start_time: branch.work_start_time ?? '09:00',
    is_active:       branch.is_active,
  }
  fErrors.value   = {}
  showModal.value = true
}

function validate() {
  fErrors.value = {}
  let ok = true
  if (!form.value.name)    { fErrors.value.name    = 'Nomi kiritilishi shart'; ok = false }
  if (!form.value.address) { fErrors.value.address = 'Manzil kiritilishi shart'; ok = false }
  return ok
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    if (modalMode.value === 'add') {
      await api.post('/api/branches', form.value)
      toast.success('Filial qo\'shildi')
    } else {
      await api.patch(`/api/branches/${editId.value}`, form.value)
      toast.success('Filial yangilandi')
    }
    showModal.value = false
    fetchBranches()
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
async function deleteBranch(branch: BranchOut) {
  const ok = await confirm({
    title:   'Filialni o\'chirish',
    message: `"${branch.name}" filialni o\'chirishni tasdiqlaysizmi?`,
    type: 'danger',
  })
  if (!ok) return
  await api.delete(`/api/branches/${branch.id}`)
  toast.success('Filial o\'chirildi')
  fetchBranches()
}
</script>

<template>
  <div>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Filiallar</h1>
        <p class="text-sm text-gray-400 mt-0.5">Jami {{ total }} ta filial</p>
      </div>
      <AppButton
        v-if="can('branches')"
        variant="primary"
        @click="openAdd"
      >
        <Plus class="w-4 h-4" />
        Filial qo'shish
      </AppButton>
    </div>

    <!-- Search -->
    <div class="max-w-sm">
      <AppInput
        :model-value="search"
        placeholder="Filial nomi bo'yicha qidirish..."
        clearable
        @update:model-value="onSearch"
      >
        <template #prefix><Search class="w-4 h-4 text-gray-400" /></template>
      </AppInput>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!branches.length" class="flex flex-col items-center justify-center py-20 text-center">
      <Building2 class="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
      <p class="text-sm font-medium text-gray-500">Filiallar topilmadi</p>
      <p class="text-xs text-gray-400 mt-1">Yangi filial qo'shing yoki qidiruvni o'zgartiring</p>
    </div>

    <!-- Cards Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="branch in branches"
        :key="branch.id"
        class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow group"
      >
        <!-- Card header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
              <Building2 class="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">{{ branch.name }}</h3>
              <AppBadge :variant="branch.is_active ? 'active' : 'inactive'" size="sm" class="mt-0.5" />
            </div>
          </div>

          <!-- Actions — faqat superadmin va admin -->
          <div
            v-if="isRole('superadmin', 'admin')"
            class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500 transition-colors"
              @click="openEdit(branch)"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
              @click="deleteBranch(branch)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Card info -->
        <div class="space-y-2">
          <div v-if="branch.address" class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <MapPin class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ branch.address }}</span>
          </div>
          <div v-if="branch.phone" class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Phone class="w-3.5 h-3.5 shrink-0" />
            <span>{{ branch.phone }}</span>
          </div>
          <div v-if="branch.work_start_time" class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock class="w-3.5 h-3.5 shrink-0" />
            <span>Ish boshlanishi: {{ branch.work_start_time }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <AppButton
        variant="ghost"
        size="sm"
        :disabled="page === 1"
        @click="changePage(page - 1)"
      >
        ←
      </AppButton>
      <span class="text-sm text-gray-500">{{ page }} / {{ totalPages }}</span>
      <AppButton
        variant="ghost"
        size="sm"
        :disabled="page === totalPages"
        @click="changePage(page + 1)"
      >
        →
      </AppButton>
    </div>

  </div>

  <!-- Add / Edit Modal -->
  <AppModal
    v-model="showModal"
    :title="modalMode === 'add' ? 'Filial qo\'shish' : 'Filialni tahrirlash'"
  >
    <div class="space-y-4">
      <AppInput
        v-model="form.name"
        label="Filial nomi"
        placeholder="Masalan: Markaziy filial"
        :error="fErrors.name"
        required
      />
      <AppInput
        v-model="form.address"
        label="Manzil"
        placeholder="Shahar, ko'cha, uy"
        :error="fErrors.address"
        required
      />
      <AppInput
        v-model="form.phone"
        label="Telefon"
        placeholder="+998 90 123 45 67"
      />
      <AppInput
        v-model="form.work_start_time"
        label="Ish boshlanish vaqti"
        type="time"
      />

      <!-- is_active toggle -->
      <div class="flex items-center justify-between py-2">
        <div>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Faol holat</p>
          <p class="text-xs text-gray-400">Filial faol yoki yopiq</p>
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