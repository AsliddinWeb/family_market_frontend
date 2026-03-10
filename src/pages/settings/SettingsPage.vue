<script setup lang="ts">
/**
 * SettingsPage.vue — Sozlamalar
 *   superadmin  → hammasi (filial ish vaqti + telegram + parol)
 *   admin       → filial ish vaqti + parol
 *   barchasi    → parol o'zgartirish
 */
import { ref, onMounted, computed } from 'vue'
import {
  Settings, Clock, Send, Lock, Save, CheckCircle,
  Building2, RefreshCw, Trash2, Eye, EyeOff,
} from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { usePermission } from '@/composables/usePermission'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import type { BranchOut } from '@/types'
import api from '@/composables/useApi'

const toast = useToastStore()
const { can, isRole } = usePermission()

const isSuperadmin = computed(() => isRole.value('superadmin'))
const isAdmin      = computed(() => isRole.value('superadmin', 'admin'))

// ─── Branches — Ish vaqti ────────────────────────────────────────────────────
const branches      = ref<BranchOut[]>([])
const branchLoading = ref(false)
const savingBranch  = ref<number | null>(null)
const branchTimes   = ref<Record<number, string>>({})  // branch.id → HH:MM

async function fetchBranches() {
  if (!isAdmin.value) return
  branchLoading.value = true
  try {
    const { data } = await api.get('/api/branches', { params: { size: 100 } })
    branches.value = data.items ?? []
    branches.value.forEach(b => {
      // work_start_time "09:00:00" → "09:00"
      const t = String(b.work_start_time ?? '09:00:00')
      branchTimes.value[b.id] = t.slice(0, 5)
    })
  } catch { toast.error('Filiallarni olishda xato') }
  finally { branchLoading.value = false }
}

async function saveBranchTime(branch: BranchOut) {
  const t = branchTimes.value[branch.id]
  if (!t) return
  savingBranch.value = branch.id
  try {
    await api.patch(`/api/branches/${branch.id}`, { work_start_time: t + ':00' })
    toast.success(`${branch.name} — ish vaqti saqlandi`)
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Xato yuz berdi')
  } finally { savingBranch.value = null }
}

// ─── Telegram Webhook ────────────────────────────────────────────────────────
const webhookLoading = ref(false)
const webhookStatus  = ref<'idle' | 'set' | 'deleted'>('idle')

async function setWebhook() {
  webhookLoading.value = true
  try {
    const { data } = await api.post('/api/telegram/set-webhook')
    webhookStatus.value = 'set'
    toast.success('Webhook o\'rnatildi: ' + (data?.url ?? ''))
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Webhook o\'rnatishda xato')
  } finally { webhookLoading.value = false }
}

async function deleteWebhook() {
  webhookLoading.value = true
  try {
    await api.post('/api/telegram/delete-webhook')
    webhookStatus.value = 'deleted'
    toast.success('Webhook o\'chirildi')
  } catch (err: any) {
    toast.error(err?.response?.data?.detail ?? 'Webhook o\'chirishda xato')
  } finally { webhookLoading.value = false }
}

// ─── Parol o'zgartirish ──────────────────────────────────────────────────────
const passForm = ref({
  old_password: '',
  new_password: '',
  confirm:      '',
})
const passErrors   = ref<Record<string, string>>({})
const passLoading  = ref(false)
const showOld      = ref(false)
const showNew      = ref(false)
const showConfirm  = ref(false)

function validatePass() {
  const e: Record<string, string> = {}
  if (!passForm.value.old_password) e.old_password = 'Joriy parol kiritilmagan'
  if (!passForm.value.new_password) e.new_password = 'Yangi parol kiritilmagan'
  else if (passForm.value.new_password.length < 6) e.new_password = 'Kamida 6 ta belgi'
  if (!passForm.value.confirm) e.confirm = 'Tasdiqlash paroli kiritilmagan'
  else if (passForm.value.new_password !== passForm.value.confirm) e.confirm = 'Parollar mos kelmadi'
  passErrors.value = e
  return !Object.keys(e).length
}

async function changePassword() {
  if (!validatePass()) return
  passLoading.value = true
  try {
    await api.patch('/api/auth/change-password', {
      old_password: passForm.value.old_password,
      new_password: passForm.value.new_password,
    })
    toast.success('Parol muvaffaqiyatli o\'zgartirildi')
    passForm.value = { old_password: '', new_password: '', confirm: '' }
    passErrors.value = {}
  } catch (err: any) {
    const detail = err?.response?.data?.detail
    if (typeof detail === 'string' && detail.toLowerCase().includes('incorrect')) {
      passErrors.value = { old_password: 'Joriy parol noto\'g\'ri' }
    } else {
      toast.error(detail ?? 'Parol o\'zgartirishda xato')
    }
  } finally { passLoading.value = false }
}

const passStrength = computed(() => {
  const p = passForm.value.new_password
  if (!p) return 0
  let s = 0
  if (p.length >= 6)  s++
  if (p.length >= 10) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})

const passStrengthLabel = computed(() => ['', 'Juda zaif', 'Zaif', "O'rtacha", 'Kuchli', 'Juda kuchli'][passStrength.value] ?? '')
const passStrengthColor = computed(() => ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'][passStrength.value] ?? '')

onMounted(fetchBranches)
</script>

<template>
  <div>
  <div class="space-y-6 max-w-3xl">

    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Sozlamalar</h1>
      <p class="text-sm text-gray-400 mt-0.5">Tizim va hisob sozlamalari</p>
    </div>

    <!-- ── 1. Filial ish vaqti (admin+) ── -->
    <div v-if="isAdmin" class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <component :is="Building2" class="w-4.5 h-4.5 text-blue-500" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Filial ish vaqti</h2>
          <p class="text-xs text-gray-400">Har filial uchun ish boshlash vaqtini belgilang</p>
        </div>
        <AppButton v-if="!branchLoading" variant="ghost" size="sm" class="ml-auto" @click="fetchBranches">
          <component :is="RefreshCw" class="w-3.5 h-3.5" />
        </AppButton>
      </div>

      <div class="divide-y divide-gray-50 dark:divide-gray-800">
        <div v-if="branchLoading" class="px-6 py-4 text-sm text-gray-400 animate-pulse">Yuklanmoqda...</div>
        <div v-else-if="!branches.length" class="px-6 py-4 text-sm text-gray-400">Filiallar topilmadi</div>

        <div v-for="branch in branches" :key="branch.id"
          class="flex items-center gap-4 px-6 py-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ branch.name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ branch.address }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <component :is="Clock" class="w-4 h-4 text-gray-400" />
            <input
              v-model="branchTimes[branch.id]"
              type="time"
              class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500" />
            <AppButton
              variant="primary"
              size="sm"
              :loading="savingBranch === branch.id"
              @click="saveBranchTime(branch)">
              <component :is="Save" class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Saqlash</span>
            </AppButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 2. Telegram Webhook (superadmin) ── -->
    <div v-if="isSuperadmin" class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <component :is="Send" class="w-4.5 h-4.5 text-blue-500" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Telegram Bot</h2>
          <p class="text-xs text-gray-400">Webhook boshqaruvi</p>
        </div>
      </div>

      <div class="px-6 py-5 space-y-4">
        <!-- Status badge -->
        <div v-if="webhookStatus !== 'idle'"
          :class="['flex items-center gap-2 px-3 py-2 rounded-lg text-sm', webhookStatus === 'set' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-500']">
          <component :is="CheckCircle" class="w-4 h-4" />
          {{ webhookStatus === 'set' ? 'Webhook muvaffaqiyatli o\'rnatildi' : 'Webhook o\'chirildi' }}
        </div>

        <p class="text-sm text-gray-500 dark:text-gray-400">
          Telegram bot xabarnomalarini yoqish uchun webhook o'rnating. O'chirish uchun delete bosing.
        </p>

        <div class="flex items-center gap-3">
          <AppButton variant="primary" :loading="webhookLoading" @click="setWebhook">
            <component :is="Send" class="w-4 h-4" />
            Webhook o'rnatish
          </AppButton>
          <AppButton variant="danger" :loading="webhookLoading" @click="deleteWebhook">
            <component :is="Trash2" class="w-4 h-4" />
            O'chirish
          </AppButton>
        </div>
      </div>
    </div>

    <!-- ── 3. Parol o'zgartirish (barchasi) ── -->
    <div class="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
          <component :is="Lock" class="w-4.5 h-4.5 text-primary-500" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Parolni o'zgartirish</h2>
          <p class="text-xs text-gray-400">Xavfsizlik uchun parolni muntazam yangilang</p>
        </div>
      </div>

      <div class="px-6 py-5 space-y-4">

        <!-- Joriy parol -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Joriy parol</label>
          <div class="relative">
            <input
              v-model="passForm.old_password"
              :type="showOld ? 'text' : 'password'"
              placeholder="••••••••"
              :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 pr-10 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500', passErrors.old_password ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']" />
            <button type="button" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="showOld = !showOld">
              <component :is="showOld ? EyeOff : Eye" class="w-4 h-4" />
            </button>
          </div>
          <p v-if="passErrors.old_password" class="text-xs text-red-500 mt-1">{{ passErrors.old_password }}</p>
        </div>

        <!-- Yangi parol -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yangi parol</label>
          <div class="relative">
            <input
              v-model="passForm.new_password"
              :type="showNew ? 'text' : 'password'"
              placeholder="••••••••"
              :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 pr-10 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500', passErrors.new_password ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']" />
            <button type="button" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="showNew = !showNew">
              <component :is="showNew ? EyeOff : Eye" class="w-4 h-4" />
            </button>
          </div>
          <!-- Strength bar -->
          <div v-if="passForm.new_password" class="mt-2 space-y-1">
            <div class="flex gap-1">
              <div v-for="i in 5" :key="i"
                :class="['h-1 flex-1 rounded-full transition-colors', i <= passStrength ? passStrengthColor : 'bg-gray-200 dark:bg-gray-700']" />
            </div>
            <p class="text-xs text-gray-400">{{ passStrengthLabel }}</p>
          </div>
          <p v-if="passErrors.new_password" class="text-xs text-red-500 mt-1">{{ passErrors.new_password }}</p>
        </div>

        <!-- Tasdiqlash -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yangi parolni tasdiqlash</label>
          <div class="relative">
            <input
              v-model="passForm.confirm"
              :type="showConfirm ? 'text' : 'password'"
              placeholder="••••••••"
              :class="['w-full text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 pr-10 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500', passErrors.confirm ? 'border-red-400' : 'border-gray-200 dark:border-gray-700']" />
            <button type="button" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="showConfirm = !showConfirm">
              <component :is="showConfirm ? EyeOff : Eye" class="w-4 h-4" />
            </button>
          </div>
          <!-- Match indicator -->
          <div v-if="passForm.confirm && passForm.new_password" class="flex items-center gap-1.5 mt-1">
            <component :is="passForm.new_password === passForm.confirm ? CheckCircle : Settings"
              :class="['w-3.5 h-3.5', passForm.new_password === passForm.confirm ? 'text-green-500' : 'text-red-400']" />
            <span :class="['text-xs', passForm.new_password === passForm.confirm ? 'text-green-500' : 'text-red-400']">
              {{ passForm.new_password === passForm.confirm ? 'Parollar mos' : 'Parollar mos emas' }}
            </span>
          </div>
          <p v-if="passErrors.confirm" class="text-xs text-red-500 mt-1">{{ passErrors.confirm }}</p>
        </div>

        <AppButton variant="primary" :loading="passLoading" @click="changePassword">
          <component :is="Lock" class="w-4 h-4" />
          Parolni o'zgartirish
        </AppButton>
      </div>
    </div>

  </div>
  </div>
</template>