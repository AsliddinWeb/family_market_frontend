<script setup lang="ts">
/**
 * EmployeeAttendance.vue
 * Faqat "employee" roli uchun:
 *   - Check-in / Check-out (kamera + GPS)
 *   - O'z davomati tarixi
 *   - Oylik xulosa
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Clock, CheckCircle2,
  LogIn, LogOut, RefreshCw, MapPin,
} from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppTable from '@/components/ui/AppTable.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/composables/useApi'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatTime, todayISO, currentYearMonth } from '@/utils/format'
import type { AttendanceOut, AttendanceSummary, AttendanceStatus } from '@/types'

const toast      = useToastStore()
const auth       = useAuthStore()
const myEmployeeId = ref<number | null>(auth.user?.employee_id ?? null)

// ── Bugungi davomat ────────────────────────────────────────────────────────
const todayAtt      = ref<AttendanceOut | null>(null)
const todayLoading  = ref(false)
const checkinLoading = ref(false)

const checkedIn  = computed(() => !!todayAtt.value?.check_in_time)
const checkedOut = computed(() => !!todayAtt.value?.check_out_time)

async function fetchToday() {
  todayLoading.value = true
  try {
    const today = todayISO()
    const { data } = await api.get('/api/attendance', {
      params: { date_from: today, date_to: today, size: 1 }
    })
    todayAtt.value = data.items?.[0] ?? null
  } catch { /* silent */ }
  finally { todayLoading.value = false }
}

// ── GPS ─────────────────────────────────────────────────────────────────────
const gpsStatus = ref<'idle' | 'loading' | 'ok' | 'fail'>('idle')
const location  = ref<{ lat: number; lng: number } | null>(null)

function getLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('GPS qo\'llab-quvvatlanmaydi')); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => reject(new Error('GPS aniqlanmadi')),
      { timeout: 10000, enableHighAccuracy: true }
    )
  })
}

// ── Camera ──────────────────────────────────────────────────────────────────
const cameraOpen  = ref(false)
const cameraMode  = ref<'checkin' | 'checkout'>('checkin')
const cameraError    = ref('')
const capturedPhoto  = ref<string | null>(null)
const videoRef    = ref<HTMLVideoElement | null>(null)
const canvasRef   = ref<HTMLCanvasElement | null>(null)
const stream      = ref<MediaStream | null>(null)

async function openCamera(mode: 'checkin' | 'checkout') {
  cameraMode.value  = mode
  cameraError.value = ''
  cameraOpen.value  = true
  await new Promise(r => setTimeout(r, 150))

  const constraints = [
    { video: { facingMode: 'user', width: { ideal: 640 } }, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false },
  ]
  for (const c of constraints) {
    try {
      stream.value = await navigator.mediaDevices.getUserMedia(c)
      if (videoRef.value) {
        videoRef.value.srcObject = stream.value
        try { await videoRef.value.play() } catch { /* ignore */ }
      }
      return
    } catch { /* try next */ }
  }
  cameraError.value = 'Kamera ochilmadi. Brauzer sozlamalarida ruxsat bering.'
}

function closeCamera() {
  stream.value?.getTracks().forEach(t => t.stop())
  stream.value     = null
  cameraOpen.value = false
}

function capturePhoto(): string | null {
  const video  = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas) return null
  canvas.width  = video.videoWidth  || 640
  canvas.height = video.videoHeight || 480
  canvas.getContext('2d')?.drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1] ?? null
}

onUnmounted(() => closeCamera())

// ── Check-in ─────────────────────────────────────────────────────────────────
async function startCheckin() {
  checkinLoading.value = true
  gpsStatus.value = 'loading'
  try {
    try { location.value = await getLocation(); gpsStatus.value = 'ok' }
    catch { gpsStatus.value = 'fail'; location.value = null }
    await openCamera('checkin')
  } catch (e: any) {
    toast.error(e.message)
    checkinLoading.value = false
    gpsStatus.value = 'idle'
  }
}

async function confirmCheckin() {
  capturedPhoto.value = capturePhoto()
  closeCamera()
  try {
    const { data } = await api.post('/api/attendance/check-in', {
      employee_id:       myEmployeeId.value,
      check_in_photo:    capturedPhoto.value,
      check_in_location: location.value
        ? { latitude: location.value.lat, longitude: location.value.lng }
        : null,
      source:            'web',
    })
    todayAtt.value = data
    toast.success('Kelish qayd etildi ✅')
    fetchHistory()
  } catch (e: any) {
    toast.error(e?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally {
    checkinLoading.value = false
    gpsStatus.value = 'idle'
  }
}

// ── Check-out ─────────────────────────────────────────────────────────────────
async function startCheckout() {
  if (!todayAtt.value) return
  checkinLoading.value = true
  gpsStatus.value = 'loading'
  try {
    try { location.value = await getLocation(); gpsStatus.value = 'ok' }
    catch { gpsStatus.value = 'fail'; location.value = null }
    await openCamera('checkout')
  } catch (e: any) {
    toast.error(e.message)
    checkinLoading.value = false
    gpsStatus.value = 'idle'
  }
}

async function confirmCheckout() {
  capturedPhoto.value = capturePhoto()
  closeCamera()
  try {
    const { data } = await api.post('/api/attendance/check-out', {
      employee_id:        myEmployeeId.value,
      check_out_photo:    capturedPhoto.value,
      check_out_location: location.value
        ? { latitude: location.value.lat, longitude: location.value.lng }
        : null,
      source:             'web',
    })
    todayAtt.value = data
    toast.success('Ketish qayd etildi 👋')
    fetchHistory()
  } catch (e: any) {
    toast.error(e?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally {
    checkinLoading.value = false
    gpsStatus.value = 'idle'
  }
}

function onConfirm() {
  if (cameraMode.value === 'checkin') confirmCheckin()
  else confirmCheckout()
}

// ── Tarix ──────────────────────────────────────────────────────────────────
const records    = ref<AttendanceOut[]>([])
const total      = ref(0)
const page       = ref(1)
const loading    = ref(false)
const totalPages = computed(() => Math.ceil(total.value / 20))

const filters = ref({
  date_from: '',
  date_to:   '',
  status:    '' as AttendanceStatus | '',
})

async function fetchHistory() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, size: 20 }
    if (filters.value.date_from) params.date_from = filters.value.date_from
    if (filters.value.date_to)   params.date_to   = filters.value.date_to
    if (filters.value.status)    params.status    = filters.value.status
    const { data } = await api.get('/api/attendance', { params })
    records.value = data.items ?? []
    total.value   = data.total ?? 0
  } catch {
    toast.error('Davomat ma\'lumotlarini olishda xato')
  } finally { loading.value = false }
}

function applyFilter() { page.value = 1; fetchHistory() }
function changePage(p: number) { page.value = p; fetchHistory() }

// ── Oylik xulosa ──────────────────────────────────────────────────────────
const { year: initYear, month: initMonth } = currentYearMonth()
const summaryYear    = ref(initYear)
const summaryMonth   = ref(initMonth)
const summary        = ref<AttendanceSummary | null>(null)
const summaryLoading = ref(false)

async function fetchSummary() {
  summaryLoading.value = true
  summary.value = null
  try {
    const { data } = await api.get('/api/attendance/summary', {
      params: { employee_id: 0, year: summaryYear.value, month: summaryMonth.value },
    })
    summary.value = data
  } catch {
    toast.error('Xulosa yuklanmadi')
  } finally { summaryLoading.value = false }
}

onMounted(async () => {
  if (!myEmployeeId.value) {
    try {
      const { data: me } = await api.get('/api/employees/me')
      myEmployeeId.value = me.id
    } catch { /* silent */ }
  }
  fetchToday()
  fetchHistory()
  fetchSummary()
})

const columns = [
  { key: 'date',      label: 'Sana',      mobileTitle: true },
  { key: 'check_in',  label: 'Kelish' },
  { key: 'check_out', label: 'Ketish' },
  { key: 'late',      label: 'Kechikish' },
  { key: 'status',    label: 'Holat' },
]
const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const selectCls = 'w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500'
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Mening davomatim</h1>
        <p class="text-sm text-gray-400 mt-0.5">Kelish-ketish tarixi va oylik xulosa</p>
      </div>
      <AppButton variant="ghost" size="sm" :loading="loading || todayLoading" @click="fetchToday(); fetchHistory()">
        <component :is="RefreshCw" class="w-4 h-4" />
      </AppButton>
    </div>

    <!-- ── Bugungi holat + Check-in/out ──────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">

      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Bugun</h3>
        <AppBadge v-if="todayAtt?.status" :variant="todayAtt.status" />
        <span v-else class="text-xs text-gray-400">Qayd etilmagan</span>
      </div>

      <!-- Vaqtlar -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
          <div class="flex items-center gap-1.5 mb-1">
            <LogIn class="w-3.5 h-3.5 text-green-500" />
            <span class="text-[11px] text-green-500 uppercase tracking-wide font-semibold">Kelish</span>
          </div>
          <p class="text-xl font-bold text-green-700 dark:text-green-400 font-mono">
            {{ todayAtt?.check_in_time ? formatTime(todayAtt.check_in_time) : '—' }}
          </p>
        </div>
        <div class="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
          <div class="flex items-center gap-1.5 mb-1">
            <LogOut class="w-3.5 h-3.5 text-red-400" />
            <span class="text-[11px] text-red-400 uppercase tracking-wide font-semibold">Ketish</span>
          </div>
          <p class="text-xl font-bold text-red-600 dark:text-red-400 font-mono">
            {{ todayAtt?.check_out_time ? formatTime(todayAtt.check_out_time) : '—' }}
          </p>
        </div>
      </div>

      <!-- Kechikish -->
      <div v-if="(todayAtt?.late_minutes ?? 0) > 0"
        class="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg
               bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
        <Clock class="w-4 h-4 text-amber-500 shrink-0" />
        <span class="text-sm text-amber-700 dark:text-amber-400 font-medium">
          {{ todayAtt!.late_minutes }} daqiqa kechikdingiz
        </span>
      </div>

      <!-- Tugmalar -->
      <div class="flex gap-3">
        <!-- Check-in -->
        <button
          v-if="!checkedIn"
          :disabled="checkinLoading || todayLoading"
          class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                 bg-primary-500 hover:bg-primary-600 active:scale-[0.98]
                 text-white font-semibold text-sm transition-all
                 disabled:opacity-60 disabled:cursor-not-allowed"
          @click="startCheckin"
        >
          <template v-if="checkinLoading">
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Aniqlanmoqda...
          </template>
          <template v-else>
            <LogIn class="w-4 h-4" />
            Kelishni qayd etish
          </template>
        </button>

        <!-- Check-out -->
        <button
          v-else-if="!checkedOut"
          :disabled="checkinLoading"
          class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                 bg-red-500 hover:bg-red-600 active:scale-[0.98]
                 text-white font-semibold text-sm transition-all
                 disabled:opacity-60 disabled:cursor-not-allowed"
          @click="startCheckout"
        >
          <template v-if="checkinLoading">
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Aniqlanmoqda...
          </template>
          <template v-else>
            <LogOut class="w-4 h-4" />
            Ketishni qayd etish
          </template>
        </button>

        <!-- Tugadi -->
        <div
          v-else
          class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                 bg-gray-100 dark:bg-gray-800
                 text-gray-500 dark:text-gray-400 text-sm font-medium"
        >
          <CheckCircle2 class="w-4 h-4 text-green-500" />
          Bugun qayd etildi
        </div>
      </div>

      <!-- GPS status -->
      <div v-if="gpsStatus === 'ok'" class="flex items-center gap-1.5 mt-2 text-xs text-green-500">
        <MapPin class="w-3 h-3" /> GPS aniqlandi
      </div>
      <div v-else-if="gpsStatus === 'fail'" class="flex items-center gap-1.5 mt-2 text-xs text-amber-500">
        <MapPin class="w-3 h-3" /> GPS aniqlanmadi — baribir davom etildi
      </div>
    </div>

    <!-- ── Kamera (fullscreen) ────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="cameraOpen" class="fixed inset-0 z-50 flex flex-col bg-black">
        <!-- Topbar -->
        <div class="flex items-center justify-between px-4 py-3 bg-black/70">
          <p class="text-white font-semibold text-sm">
            {{ cameraMode === 'checkin' ? '📥 Kelishni tasdiqlash' : '📤 Ketishni tasdiqlash' }}
          </p>
          <button class="text-white/60 hover:text-white text-sm px-2 py-1" @click="closeCamera(); checkinLoading = false; gpsStatus = 'idle'">
            Bekor
          </button>
        </div>

        <!-- Video -->
        <div class="flex-1 relative overflow-hidden">
          <video
            ref="videoRef"
            autoplay playsinline muted
            class="w-full h-full object-cover"
          />
          <canvas ref="canvasRef" class="hidden" />

          <!-- Oval guide -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-48 h-64 rounded-full border-4 border-white/50
                        shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>

          <!-- Hint -->
          <p class="absolute top-4 left-0 right-0 text-center text-white/70 text-sm">
            Yuzingizni oval ichiga kiriting
          </p>

          <!-- Error -->
          <p v-if="cameraError" class="absolute bottom-24 left-4 right-4 text-center text-red-400 text-sm bg-black/60 rounded-lg py-2 px-3">
            {{ cameraError }}
          </p>
        </div>

        <!-- Confirm button -->
        <div class="px-4 pb-10 pt-4 bg-black/70">
          <button
            class="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
            :class="cameraMode === 'checkin'
              ? 'bg-primary-500 hover:bg-primary-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'"
            @click="onConfirm"
          >
            {{ cameraMode === 'checkin' ? '✅ Kelishni tasdiqlash' : '👋 Ketishni tasdiqlash' }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- ── Oylik xulosa ────────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Oylik xulosa</h2>
        <div class="flex items-center gap-2">
          <select v-model.number="summaryMonth"
            class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500">
            <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
          </select>
          <input v-model.number="summaryYear" type="number" min="2020" max="2030"
            class="w-20 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500" />
          <AppButton variant="primary" size="sm" :loading="summaryLoading" @click="fetchSummary">
            Ko'rish
          </AppButton>
        </div>
      </div>

      <div v-if="summaryLoading" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SkeletonLoader v-for="i in 5" :key="i" variant="text" class="h-20" />
      </div>
      <div v-else-if="summary" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-100 dark:border-green-800/30">
          <p class="text-2xl font-bold text-green-600">{{ summary.present }}</p>
          <p class="text-xs text-green-500 mt-1">Keldi</p>
        </div>
        <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800/30">
          <p class="text-2xl font-bold text-amber-600">{{ summary.late }}</p>
          <p class="text-xs text-amber-500 mt-1">Kech keldi</p>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-100 dark:border-red-800/30">
          <p class="text-2xl font-bold text-red-600">{{ summary.absent }}</p>
          <p class="text-xs text-red-500 mt-1">Kelmadi</p>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-800/30">
          <p class="text-2xl font-bold text-blue-600">{{ summary.half_day }}</p>
          <p class="text-xs text-blue-500 mt-1">Yarim kun</p>
        </div>
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
          <p class="text-2xl font-bold text-gray-700 dark:text-gray-200">{{ summary.total_late_minutes }}</p>
          <p class="text-xs text-gray-400 mt-1">Kechikish (daq)</p>
        </div>
      </div>
      <div v-else class="text-center py-6 text-sm text-gray-400">
        Oy va yilni tanlab "Ko'rish" tugmasini bosing
      </div>
    </div>

    <!-- ── Tarix filtrlari ─────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Dan</label>
          <input v-model="filters.date_from" type="date" :class="selectCls" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Gacha</label>
          <input v-model="filters.date_to" type="date" :class="selectCls" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-400 uppercase tracking-wide mb-1">Holat</label>
          <select v-model="filters.status" :class="selectCls" style="width:140px">
            <option value="">Barchasi</option>
            <option value="present">Keldi</option>
            <option value="late">Kech keldi</option>
            <option value="absent">Kelmadi</option>
            <option value="half_day">Yarim kun</option>
          </select>
        </div>
        <AppButton variant="primary" size="sm" @click="applyFilter">Ko'rsatish</AppButton>
      </div>
      <p class="text-xs text-gray-400 mt-2">Jami: {{ total }} ta yozuv</p>
    </div>

    <!-- ── Jadval ──────────────────────────────────────────────────────────── -->
    <AppTable :columns="columns" :rows="records" :loading="loading" empty-text="Davomat yozuvlari topilmadi">

      <template #cell-date="{ row }">
        <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ formatDate(row.date) }}</span>
      </template>

      <template #cell-check_in="{ row }">
        <div class="flex items-center gap-1.5 text-sm">
          <LogIn class="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span class="font-mono">{{ row.check_in_time ? formatTime(row.check_in_time) : '—' }}</span>
        </div>
      </template>

      <template #cell-check_out="{ row }">
        <div class="flex items-center gap-1.5 text-sm">
          <LogOut class="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span class="font-mono">{{ row.check_out_time ? formatTime(row.check_out_time) : '—' }}</span>
        </div>
      </template>

      <template #cell-late="{ row }">
        <span v-if="row.late_minutes > 0" class="flex items-center gap-1 text-sm text-amber-500 font-medium">
          <Clock class="w-3.5 h-3.5" />
          +{{ row.late_minutes }} daq
        </span>
        <span v-else class="text-gray-400 text-sm">—</span>
      </template>

      <template #cell-status="{ row }">
        <AppBadge :variant="row.status" />
      </template>
    </AppTable>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <AppButton variant="ghost" size="sm" :disabled="page === 1" @click="changePage(page - 1)">←</AppButton>
      <span class="text-sm text-gray-500">{{ page }} / {{ totalPages }}</span>
      <AppButton variant="ghost" size="sm" :disabled="page === totalPages" @click="changePage(page + 1)">→</AppButton>
    </div>

  </div>
</template>