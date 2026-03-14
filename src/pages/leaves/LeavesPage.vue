<script setup lang="ts">
/**
 * LeavesPage.vue — Ruxsatlar
 *   superadmin / admin  → barchani ko'rish + tasdiqlash/rad + qo'shish (boshqa uchun)
 *   hr_manager          → barchani ko'rish + tasdiqlash/rad + qo'shish
 *   branch_manager      → barchani ko'rish + faqat tasdiqlash/rad
 *   employee            → faqat o'ziniki + qo'shish (o'zi uchun) + bekor qilish
 */
import { ref, computed, onMounted } from 'vue'
import { Plus, RefreshCw, CheckCircle2, XCircle, Ban, Filter, Calendar, Clock, Info } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppInput from '@/components/ui/AppInput.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import api from '@/composables/useApi'
import { formatDate } from '@/utils/format'
import type { LeaveOut, LeaveType, LeaveStatus, EmployeeOut } from '@/types'

const toast       = useToastStore()
const { confirm } = useConfirm()
const { can, canAny, isRole } = usePermission()
const auth        = useAuthStore()

// ── Rollar ────────────────────────────────────────────────────────────────────
const isEmployee         = computed(() => isRole.value('employee'))
const canApprove         = computed(() => canAny.value('leaves') && !isRole.value('employee'))
const canCreate          = computed(() => canAny.value('leaves', 'leaves.own'))
const canCreateForOthers = computed(() => can.value('leaves'))

// ── Filters ───────────────────────────────────────────────────────────────────
const filterStatus = ref<LeaveStatus | ''>('')
const filterType   = ref<LeaveType | ''>('')
const filterEmpId  = ref<number | undefined>(undefined)
const page         = ref(1)
const loading      = ref(false)

// ── Data ──────────────────────────────────────────────────────────────────────
const leaves     = ref<LeaveOut[]>([])
const total      = ref(0)
const totalPages = computed(() => Math.ceil(total.value / 20))

const stats = computed(() => ({
  pending:  leaves.value.filter(l => l.status === 'pending').length,
  approved: leaves.value.filter(l => l.status === 'approved').length,
  rejected: leaves.value.filter(l => l.status === 'rejected').length,
}))

async function fetchLeaves() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, size: 20 }
    if (filterStatus.value) params.status      = filterStatus.value
    if (filterType.value)   params.leave_type  = filterType.value
    if (filterEmpId.value)  params.employee_id = filterEmpId.value
    if (isEmployee.value)   params.employee_id = auth.user?.employee_id ?? auth.user?.id

    const { data } = await api.get('/api/leaves', { params })
    leaves.value = data.items ?? []
    total.value  = data.total ?? 0
  } catch { toast.error("Ta'tillarni olishda xato") }
  finally { loading.value = false }
}

function applyFilter() { page.value = 1; fetchLeaves() }
function changePage(p: number) { page.value = p; fetchLeaves() }
onMounted(fetchLeaves)

// ── Employees ─────────────────────────────────────────────────────────────────
const employees  = ref<EmployeeOut[]>([])
const empLoading = ref(false)

async function fetchEmployees() {
  if (employees.value.length) return
  empLoading.value = true
  try {
    const { data } = await api.get('/api/employees', { params: { size: 100, is_active: true } })
    employees.value = data.items ?? []
  } finally { empLoading.value = false }
}

function empName(id: number) {
  return employees.value.find(e => e.id === id)?.full_name ?? `#${id}`
}

// ── Enum labels ───────────────────────────────────────────────────────────────
const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Yillik', sick: 'Kasallik', unpaid: "Haqsiz", maternity: 'Dekret', other: 'Boshqa',
}
const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan', cancelled: 'Bekor qilingan',
}

// ── Create modal ──────────────────────────────────────────────────────────────
const showCreate  = ref(false)
const creating    = ref(false)
const createForm  = ref({
  employee_id: 0,
  leave_type:  'annual' as LeaveType,
  start_date:  '',
  end_date:    '',
  reason:      '',
})
const createErrors  = ref<Record<string, string>>({})

// Preview: kalendar kunlari (taxminiy, dam olish kunlarisiz aniq hisobi backend da)
const previewCalendarDays = computed(() => {
  if (!createForm.value.start_date || !createForm.value.end_date) return 0
  const s = new Date(createForm.value.start_date)
  const e = new Date(createForm.value.end_date)
  if (e < s) return 0
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
})

async function openCreate() {
  if (canCreateForOthers.value) await fetchEmployees()
  createForm.value = {
    employee_id: isEmployee.value ? (auth.user?.employee_id ?? 0) : 0,
    leave_type:  'annual',
    start_date:  '',
    end_date:    '',
    reason:      '',
  }
  createErrors.value = {}
  showCreate.value = true
}

function validateCreate() {
  const e: Record<string, string> = {}
  if (canCreateForOthers.value && !createForm.value.employee_id) e.employee_id = 'Xodim tanlang'
  if (!createForm.value.start_date) e.start_date = 'Boshlanish sanasi kiritilmagan'
  if (!createForm.value.end_date)   e.end_date   = "Tugash sanasi kiritilmagan"
  if (createForm.value.end_date && createForm.value.start_date &&
      createForm.value.end_date < createForm.value.start_date)
    e.end_date = "Tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas"
  createErrors.value = e
  return !Object.keys(e).length
}

async function saveCreate() {
  if (!validateCreate()) return
  creating.value = true
  try {
    const payload: any = { ...createForm.value }
    if (isEmployee.value) payload.employee_id = auth.user?.employee_id ?? auth.user?.id
    const { data } = await api.post('/api/leaves', payload)
    // Backend haqiqiy ish kunlarini qaytaradi (dam olish kunlari ayirilgan)
    const realDays = data.days_count ?? previewCalendarDays.value
    toast.success(`Ta'til so'rovi yuborildi — ${realDays} ish kuni`)
    showCreate.value = false
    fetchLeaves()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally { creating.value = false }
}

// ── Approve / Reject ──────────────────────────────────────────────────────────
const actionLoading = ref<number | null>(null)

async function updateStatus(leave: LeaveOut, status: LeaveStatus, rejectionReason?: string) {
  actionLoading.value = leave.id
  try {
    await api.patch(`/api/leaves/${leave.id}/status`, { status, rejection_reason: rejectionReason ?? null })
    toast.success(status === 'approved' ? 'Tasdiqlandi' : 'Rad etildi')
    fetchLeaves()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally { actionLoading.value = null }
}

async function approveLeave(leave: LeaveOut) {
  const ok = await confirm({
    title: 'Tasdiqlash',
    message: `${empName(leave.employee_id)} ning ${LEAVE_TYPE_LABELS[leave.leave_type]} ta'tilini (${leave.days_count} ish kuni) tasdiqlaysizmi?`,
    type: 'info',
  })
  if (ok) await updateStatus(leave, 'approved')
}

// Reject — sabab bilan
const showRejectModal = ref(false)
const rejectingLeave  = ref<LeaveOut | null>(null)
const rejectReason    = ref('')

function openReject(leave: LeaveOut) {
  rejectingLeave.value = leave
  rejectReason.value   = ''
  showRejectModal.value = true
}

async function confirmReject() {
  if (!rejectingLeave.value) return
  await updateStatus(rejectingLeave.value, 'rejected', rejectReason.value || undefined)
  showRejectModal.value = false
}

// ── Cancel ────────────────────────────────────────────────────────────────────
async function cancelLeave(leave: LeaveOut) {
  const ok = await confirm({
    title: "Bekor qilish",
    message: `Ta'til so'rovini bekor qilmoqchimisiz?`,
    type: 'warning',
  })
  if (!ok) return
  actionLoading.value = leave.id
  try {
    await api.patch(`/api/leaves/${leave.id}/cancel`)
    toast.success("Bekor qilindi")
    fetchLeaves()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally { actionLoading.value = null }
}

function canCancelLeave(leave: LeaveOut): boolean {
  if (leave.status !== 'pending') return false
  if (canApprove.value) return true
  return isEmployee.value && leave.employee_id === (auth.user?.employee_id ?? auth.user?.id)
}

// ── Table columns ─────────────────────────────────────────────────────────────
const columns = computed(() => [
  ...(isEmployee.value ? [] : [{ key: 'employee', label: 'Xodim', mobileTitle: true }]),
  { key: 'type',    label: 'Turi',    ...(isEmployee.value ? { mobileTitle: true } : {}) },
  { key: 'dates',   label: 'Sana' },
  { key: 'days',    label: 'Kun', responsive: 'md' },
  { key: 'status',  label: 'Holat' },
  { key: 'actions', label: '', align: 'right' as const },
])
</script>

<template>
  <div>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Ta'tillar</h1>
        <p class="text-sm text-gray-400 mt-0.5">
          <template v-if="isEmployee">Mening ta'til so'rovlarim</template>
          <template v-else>Xodimlar ta'tili boshqaruvi</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <AppButton variant="ghost" size="sm" :loading="loading" @click="fetchLeaves">
          <component :is="RefreshCw" class="w-4 h-4" />
        </AppButton>
        <AppButton v-if="canCreate" variant="primary" @click="openCreate">
          <component :is="Plus" class="w-4 h-4" />
          <span class="hidden sm:inline">So'rov yuborish</span>
        </AppButton>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4">
      <StatCard :icon="Clock"        label="Kutilmoqda"   :value="stats.pending"  color="amber" />
      <StatCard :icon="CheckCircle2" label="Tasdiqlangan" :value="stats.approved" color="green" />
      <StatCard :icon="XCircle"      label="Rad etilgan"  :value="stats.rejected" color="red"   />
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div v-if="!isEmployee">
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Xodim</label>
          <select v-model.number="filterEmpId" @focus="fetchEmployees"
            class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
            <option :value="undefined">Barchasi</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.full_name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Turi</label>
          <select v-model="filterType"
            class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
            <option value="">Barchasi</option>
            <option v-for="(label, val) in LEAVE_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Holat</label>
          <select v-model="filterStatus"
            class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
            <option value="">Barchasi</option>
            <option v-for="(label, val) in LEAVE_STATUS_LABELS" :key="val" :value="val">{{ label }}</option>
          </select>
        </div>
        <AppButton variant="primary" size="sm" @click="applyFilter">
          <component :is="Filter" class="w-3.5 h-3.5" />
          Ko'rsatish
        </AppButton>
      </div>
      <p class="text-xs text-gray-400 mt-2">Jami {{ total }} ta yozuv</p>
    </div>

    <!-- Table -->
    <AppTable :columns="columns" :rows="leaves" :loading="loading" empty-text="Ta'til so'rovlari topilmadi">

      <template #cell-employee="{ row }">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ row.employee?.full_name ?? empName(row.employee_id) }}
        </span>
      </template>

      <template #cell-type="{ row }">
        <span class="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600">
          {{ LEAVE_TYPE_LABELS[row.leave_type] ?? row.leave_type }}
        </span>
      </template>

      <template #cell-dates="{ row }">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          <span>{{ formatDate(row.start_date) }}</span>
          <span class="text-gray-400 mx-1">→</span>
          <span>{{ formatDate(row.end_date) }}</span>
        </div>
        <p v-if="row.reason" class="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{{ row.reason }}</p>
      </template>

      <template #cell-days="{ row }">
        <!-- days_count = ish kunlari (dam olish kunlari ayirilgan) -->
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ row.days_count }} ish kuni</span>
      </template>

      <template #cell-status="{ row }">
        <div class="space-y-1">
          <AppBadge :variant="row.status" />
          <p v-if="row.rejection_reason" class="text-[10px] text-red-400 truncate max-w-[150px]">
            {{ row.rejection_reason }}
          </p>
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <button
            v-if="canApprove && row.status === 'pending'"
            :disabled="actionLoading === row.id"
            class="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
            @click="approveLeave(row)">
            <component :is="CheckCircle2" class="w-3 h-3" />
            Tasdiqlash
          </button>

          <button
            v-if="canApprove && row.status === 'pending'"
            :disabled="actionLoading === row.id"
            class="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            @click="openReject(row)">
            <component :is="XCircle" class="w-3 h-3" />
            Rad
          </button>

          <button
            v-if="canCancelLeave(row)"
            :disabled="actionLoading === row.id"
            class="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            @click="cancelLeave(row)">
            <component :is="Ban" class="w-3 h-3" />
            Bekor
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

  <!-- Create Modal -->
  <AppModal v-model="showCreate" title="Ta'til so'rovi" size="md">
    <div class="space-y-4">

      <div v-if="canCreateForOthers">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Xodim</label>
        <div v-if="empLoading" class="h-10"><SkeletonLoader variant="text" /></div>
        <select v-else v-model.number="createForm.employee_id"
          :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500',
            createErrors.employee_id ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']">
          <option :value="0" disabled>Xodim tanlang...</option>
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.full_name }}</option>
        </select>
        <p v-if="createErrors.employee_id" class="text-xs text-red-500 mt-1">{{ createErrors.employee_id }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ta'til turi</label>
        <select v-model="createForm.leave_type"
          class="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
          <option v-for="(label, val) in LEAVE_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Boshlanish</label>
          <input v-model="createForm.start_date" type="date"
            :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500',
              createErrors.start_date ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']" />
          <p v-if="createErrors.start_date" class="text-xs text-red-500 mt-1">{{ createErrors.start_date }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tugash</label>
          <input v-model="createForm.end_date" type="date"
            :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500',
              createErrors.end_date ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']" />
          <p v-if="createErrors.end_date" class="text-xs text-red-500 mt-1">{{ createErrors.end_date }}</p>
        </div>
      </div>

      <!-- Days preview — taxminiy (dam olish kunlarisiz aniq hisob backend da) -->
      <div v-if="previewCalendarDays > 0"
        class="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-sm">
        <component :is="Calendar" class="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p><strong>{{ previewCalendarDays }} kalendar kuni</strong></p>
          <p class="text-xs text-blue-400 flex items-center gap-1 mt-0.5">
            <component :is="Info" class="w-3 h-3" />
            Aniq ish kunlari saqlagandan so'ng ko'rinadi (dam olish kunlari ayiriladi)
          </p>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sabab <span class="text-gray-400 text-xs">(ixtiyoriy)</span>
        </label>
        <AppInput v-model="createForm.reason" placeholder="Ta'til sababi..." />
      </div>
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="showCreate = false">Bekor qilish</AppButton>
      <AppButton variant="primary" :loading="creating" @click="saveCreate">
        <component :is="Plus" class="w-4 h-4" />
        Yuborish
      </AppButton>
    </template>
  </AppModal>

  <!-- Reject Modal -->
  <AppModal v-model="showRejectModal" title="Rad etish sababi" size="sm">
    <div class="space-y-3">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        <strong>{{ rejectingLeave ? empName(rejectingLeave.employee_id) : '' }}</strong> ning so'rovini rad etmoqchisiz.
      </p>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sabab <span class="text-gray-400 text-xs">(ixtiyoriy)</span>
        </label>
        <AppInput v-model="rejectReason" placeholder="Rad etish sababi..." />
      </div>
    </div>
    <template #footer>
      <AppButton variant="ghost" @click="showRejectModal = false">Bekor qilish</AppButton>
      <AppButton variant="danger" @click="confirmReject">
        <component :is="XCircle" class="w-4 h-4" />
        Rad etish
      </AppButton>
    </template>
  </AppModal>

  </div>
</template>