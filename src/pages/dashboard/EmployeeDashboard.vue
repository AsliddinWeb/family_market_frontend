<script setup lang="ts">
import { onMounted, ref, computed, onUnmounted } from 'vue'
import {
  LogIn, LogOut, Clock, Umbrella, CheckCircle2,
  AlertCircle, MapPin, DollarSign, TrendingUp,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/composables/useApi'
import AppBadge from '@/components/ui/AppBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { formatTime, formatDate, formatMoney, currentYearMonth } from '@/utils/format'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const auth   = useAuthStore()
const toast  = useToastStore()

// ── State ──────────────────────────────────────────────────────────────────
const loading      = ref(true)
const myAttendance = ref<any[]>([])
const myLeaves     = ref<any[]>([])
const todayAtt     = ref<any | null>(null)
const mySalary     = ref<any | null>(null)
const presentCount = ref(0)
const lateCount    = ref(0)
const myEmployeeId = ref<number | null>(auth.user?.employee_id ?? null)

// ── Check-in/out ────────────────────────────────────────────────────────────
const checkinLoading = ref(false)
const gpsStatus      = ref<'idle' | 'loading' | 'ok' | 'fail'>('idle')
const location       = ref<{ lat: number; lng: number } | null>(null)
const videoRef       = ref<HTMLVideoElement | null>(null)
const canvasRef      = ref<HTMLCanvasElement | null>(null)
const stream         = ref<MediaStream | null>(null)
const cameraOpen     = ref(false)
const cameraMode     = ref<'checkin' | 'checkout'>('checkin')
const cameraError    = ref('')

// ── Computed ────────────────────────────────────────────────────────────────
const { year, month } = currentYearMonth()

const checkedIn  = computed(() => !!todayAtt.value?.check_in_time)
const checkedOut = computed(() => !!todayAtt.value?.check_out_time)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Xayrli tong'
  if (h < 17) return 'Xayrli kun'
  return 'Xayrli kech'
})

const netSalary = computed(() => {
  if (!mySalary.value) return null
  const net = mySalary.value.net_salary ?? mySalary.value.base_salary
  return Number(net)
})

// ── Load ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  // employee_id token da yo'q bo'lsa /employees/me dan olamiz
  if (!myEmployeeId.value) {
    try {
      const { data: me } = await api.get('/api/employees/me')
      myEmployeeId.value = me.id
    } catch { /* silent */ }
  }

  const [att, leaves, salary] = await Promise.allSettled([
    api.get('/api/attendance', { params: { page: 1, size: 20 } }),
    api.get('/api/leaves',    { params: { page: 1, size: 5  } }),
    api.get('/api/salary/my', { params: { page: 1, size: 1, year, month } }),
  ])

  if (att.status === 'fulfilled') {
    myAttendance.value = att.value.data.items ?? []
    presentCount.value = myAttendance.value.filter((a: any) =>
      a.status === 'present' || a.status === 'late'
    ).length
    lateCount.value = myAttendance.value.filter((a: any) => a.status === 'late').length
    const _d = new Date()
    const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`
    todayAtt.value = myAttendance.value.find((a: any) => a.date === today) ?? null
  }
  if (leaves.status === 'fulfilled') myLeaves.value = leaves.value.data.items ?? []
  if (salary.status === 'fulfilled') mySalary.value = salary.value.data.items?.[0] ?? null

  loading.value = false
})

// ── GPS ─────────────────────────────────────────────────────────────────────
function getLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("GPS qo'llab-quvvatlanmaydi")); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => reject(new Error('GPS aniqlanmadi')),
      { timeout: 10000, enableHighAccuracy: true }
    )
  })
}

// ── Camera ──────────────────────────────────────────────────────────────────
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
  cameraError.value = "Kamera ochilmadi. Brauzer sozlamalarida ruxsat bering."
}

function closeCamera() {
  stream.value?.getTracks().forEach(t => t.stop())
  stream.value    = null
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

// ── Check-in ────────────────────────────────────────────────────────────────
async function startCheckin() {
  checkinLoading.value = true
  gpsStatus.value = 'loading'
  try {
    try { location.value = await getLocation(); gpsStatus.value = 'ok' }
    catch { gpsStatus.value = 'fail'; location.value = { lat: 0, lng: 0 } }
    await openCamera('checkin')
  } catch (e: any) {
    toast.error(e.message)
    checkinLoading.value = false
    gpsStatus.value = 'idle'
  }
}

async function confirmCheckin() {
  capturePhoto()
  closeCamera()
  try {
    const { data } = await api.post('/api/attendance/check-in', {
      employee_id:       myEmployeeId.value,
      check_in_time:     new Date().toTimeString().slice(0, 8),
      check_in_location: location.value
        ? { latitude: location.value.lat, longitude: location.value.lng }
        : null,
    })
    todayAtt.value = data
    myAttendance.value = [data, ...myAttendance.value]
    toast.success('Kelish qayd etildi ✅')
  } catch (e: any) {
    toast.error(e?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally {
    checkinLoading.value = false
    gpsStatus.value = 'idle'
  }
}

// ── Check-out ───────────────────────────────────────────────────────────────
async function startCheckout() {
  if (!todayAtt.value) return
  checkinLoading.value = true
  gpsStatus.value = 'loading'
  try {
    try { location.value = await getLocation(); gpsStatus.value = 'ok' }
    catch { gpsStatus.value = 'fail'; location.value = { lat: 0, lng: 0 } }
    await openCamera('checkout')
  } catch (e: any) {
    toast.error(e.message)
    checkinLoading.value = false
    gpsStatus.value = 'idle'
  }
}

async function confirmCheckout() {
  capturePhoto()
  closeCamera()
  try {
    const { data } = await api.post('/api/attendance/check-out', {
      employee_id:        myEmployeeId.value,
      check_out_time:     new Date().toTimeString().slice(0, 8),
      check_out_location: location.value
        ? { latitude: location.value.lat, longitude: location.value.lng }
        : null,
    })
    todayAtt.value = data
    const idx = myAttendance.value.findIndex((a: any) => a.id === data.id)
    if (idx >= 0) myAttendance.value[idx] = data
    toast.success('Ketish qayd etildi 👋')
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

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Yillik', sick: 'Kasallik', unpaid: 'Haqsiz',
  maternity: 'Dekret', other: 'Boshqa',
}
const MONTH_LABELS = ['', 'Yanvar','Fevral','Mart','Aprel','May','Iyun',
  'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
</script>

<template>
  <div class="space-y-4 pb-20 lg:pb-6 max-w-2xl mx-auto lg:max-w-none">

    <!-- Greeting -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-gray-900 dark:text-gray-100">
          {{ greeting }}, {{ auth.user?.full_name?.split(' ')[0] ?? 'Xodim' }}! 👋
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }) }}
        </p>
      </div>
    </div>

    <!-- ── Bugungi holat + Check-in/out ──────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">

      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Bugun</h3>
        <AppBadge v-if="todayAtt?.status" :variant="todayAtt.status" />
        <span v-else class="text-xs text-gray-400">Qayd etilmagan</span>
      </div>

      <!-- Check-in / Check-out vaqtlari -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
          <div class="flex items-center gap-1.5 mb-0.5">
            <LogIn class="w-3 h-3 text-green-500" />
            <span class="text-[10px] text-green-500 uppercase tracking-wide font-semibold">Kelish</span>
          </div>
          <p class="text-xl font-bold text-green-700 dark:text-green-400 font-mono">
            {{ todayAtt?.check_in_time ? formatTime(todayAtt.check_in_time) : '—' }}
          </p>
        </div>
        <div class="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
          <div class="flex items-center gap-1.5 mb-0.5">
            <LogOut class="w-3 h-3 text-red-400" />
            <span class="text-[10px] text-red-400 uppercase tracking-wide font-semibold">Ketish</span>
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
        <Clock class="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span class="text-xs text-amber-700 dark:text-amber-400 font-medium">
          {{ todayAtt!.late_minutes }} daqiqa kechikdingiz
        </span>
      </div>

      <!-- Tugmalar -->
      <div class="flex gap-2">
        <button
          v-if="!checkedIn"
          :disabled="checkinLoading"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                 bg-primary-500 hover:bg-primary-600 active:scale-[0.98]
                 text-white font-semibold text-sm transition-all
                 disabled:opacity-60 disabled:cursor-not-allowed"
          @click="startCheckin"
        >
          <template v-if="checkinLoading">
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Aniqlanmoqda...</span>
          </template>
          <template v-else>
            <LogIn class="w-4 h-4" />
            <span>Kelishni qayd etish</span>
          </template>
        </button>

        <button
          v-else-if="!checkedOut"
          :disabled="checkinLoading"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                 bg-red-500 hover:bg-red-600 active:scale-[0.98]
                 text-white font-semibold text-sm transition-all
                 disabled:opacity-60 disabled:cursor-not-allowed"
          @click="startCheckout"
        >
          <template v-if="checkinLoading">
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Aniqlanmoqda...</span>
          </template>
          <template v-else>
            <LogOut class="w-4 h-4" />
            <span>Ketishni qayd etish</span>
          </template>
        </button>

        <div v-else
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                 bg-gray-100 dark:bg-gray-800
                 text-gray-500 dark:text-gray-400 text-sm font-medium">
          <CheckCircle2 class="w-4 h-4 text-green-500" />
          Bugun qayd etildi
        </div>
      </div>

      <!-- GPS status -->
      <p v-if="gpsStatus === 'ok'" class="flex items-center gap-1 mt-2 text-xs text-green-500">
        <MapPin class="w-3 h-3" /> GPS aniqlandi
      </p>
      <p v-else-if="gpsStatus === 'fail'" class="flex items-center gap-1 mt-2 text-xs text-amber-500">
        <MapPin class="w-3 h-3" /> GPS aniqlanmadi — davom etildi
      </p>
    </div>

    <!-- ── Kamera fullscreen ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="cameraOpen" class="fixed inset-0 z-50 flex flex-col bg-black">
        <div class="flex items-center justify-between px-4 py-3 bg-black/70 shrink-0">
          <p class="text-white font-semibold text-sm">
            {{ cameraMode === 'checkin' ? '📥 Kelishni tasdiqlash' : '📤 Ketishni tasdiqlash' }}
          </p>
          <button
            class="text-white/60 hover:text-white text-sm px-2 py-1"
            @click="closeCamera(); checkinLoading = false; gpsStatus = 'idle'"
          >
            Bekor
          </button>
        </div>
        <div class="flex-1 relative overflow-hidden">
          <video ref="videoRef" autoplay playsinline muted class="w-full h-full object-cover" />
          <canvas ref="canvasRef" class="hidden" />
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-48 h-64 rounded-full border-4 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
          <p class="absolute top-4 left-0 right-0 text-center text-white/70 text-sm">
            Yuzingizni oval ichiga kiriting
          </p>
          <p v-if="cameraError" class="absolute bottom-24 left-4 right-4 text-center text-red-400 text-sm bg-black/60 rounded-lg py-2 px-3">
            {{ cameraError }}
          </p>
        </div>
        <div class="px-4 pb-10 pt-3 bg-black/70 shrink-0">
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

    <!-- ── Stats ─────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-3 gap-3">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 3" :key="i" variant="stat" />
      </template>
      <template v-else>
        <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-3 text-center">
          <p class="text-2xl font-bold text-green-600">{{ presentCount }}</p>
          <p class="text-[11px] text-gray-400 mt-1 leading-tight">Kelgan<br>kunlar</p>
        </div>
        <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-3 text-center">
          <p class="text-2xl font-bold text-amber-500">{{ lateCount }}</p>
          <p class="text-[11px] text-gray-400 mt-1 leading-tight">Kech<br>keldi</p>
        </div>
        <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-3 text-center">
          <p class="text-lg font-bold text-primary-500 leading-tight">
            {{ netSalary !== null ? formatMoney(netSalary) : '—' }}
          </p>
          <p class="text-[11px] text-gray-400 mt-1 leading-tight">
            {{ MONTH_LABELS[month] }}<br>oylik
          </p>
        </div>
      </template>
    </div>

    <!-- ── Oylik ma'lumot (agar bor bo'lsa) ──────────────────────────── -->
    <div v-if="!loading && mySalary"
      class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex items-center gap-2 mb-3">
        <DollarSign class="w-4 h-4 text-primary-500" />
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {{ MONTH_LABELS[mySalary.period_month] }} {{ mySalary.period_year }} — Oylik
        </h3>
        <AppBadge :variant="mySalary.status" size="sm" class="ml-auto" />
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Asosiy</p>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ formatMoney(Number(mySalary.base_salary)) }}</p>
        </div>
        <div v-if="Number(mySalary.total_bonus) > 0">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Bonus</p>
          <p class="text-sm font-semibold text-green-600">+{{ formatMoney(Number(mySalary.total_bonus)) }}</p>
        </div>
        <div v-if="Number(mySalary.total_deduction) > 0">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Jarima</p>
          <p class="text-sm font-semibold text-red-500">-{{ formatMoney(Number(mySalary.total_deduction)) }}</p>
        </div>
        <div>
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Sof maosh</p>
          <p class="text-sm font-bold text-primary-600 dark:text-primary-400">{{ formatMoney(netSalary ?? 0) }}</p>
        </div>
      </div>
    </div>

    <!-- ── So'nggi davomat ────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">So'nggi davomat</h3>
        <button class="text-xs text-primary-500 font-medium" @click="router.push('/attendance')">
          Barchasi →
        </button>
      </div>
      <div v-if="loading" class="space-y-2">
        <SkeletonLoader v-for="i in 3" :key="i" variant="text" />
      </div>
      <div v-else-if="!myAttendance.length" class="flex flex-col items-center py-6">
        <AlertCircle class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
        <p class="text-sm text-gray-400">Davomat yozuvlari yo'q</p>
      </div>
      <div v-else class="space-y-2">
        <div v-for="item in myAttendance.slice(0, 5)" :key="item.id"
          class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
          <div>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ formatDate(item.date) }}</p>
            <p class="text-xs text-gray-400 font-mono mt-0.5">
              <span>{{ item.check_in_time ? formatTime(item.check_in_time) : '—' }}</span>
              <span v-if="item.check_out_time" class="mx-1 text-gray-300">→</span>
              <span v-if="item.check_out_time">{{ formatTime(item.check_out_time) }}</span>
            </p>
          </div>
          <AppBadge :variant="item.status" size="sm" />
        </div>
      </div>
    </div>

    <!-- ── Ta'tillar ──────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Ta'tillarim</h3>
        <button class="text-xs text-primary-500 font-medium" @click="router.push('/leaves')">
          Barchasi →
        </button>
      </div>
      <div v-if="loading" class="space-y-2">
        <SkeletonLoader v-for="i in 2" :key="i" variant="text" />
      </div>
      <div v-else-if="!myLeaves.length" class="flex flex-col items-center py-6">
        <Umbrella class="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
        <p class="text-sm text-gray-400">Ta'til so'rovlari yo'q</p>
      </div>
      <div v-else class="space-y-2">
        <div v-for="leave in myLeaves" :key="leave.id"
          class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#232736]">
          <div>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
              {{ LEAVE_TYPE_LABELS[leave.leave_type] ?? leave.leave_type }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ formatDate(leave.start_date) }} — {{ formatDate(leave.end_date) }}
              · {{ leave.days_count }} ish kuni
            </p>
          </div>
          <AppBadge :variant="leave.status" size="sm" />
        </div>
      </div>
    </div>

  </div>
</template>