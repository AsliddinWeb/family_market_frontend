<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useUiStore } from '@/stores/ui'
import AppToast from '@/components/ui/AppToast.vue'
import { Sun, Moon, Eye, EyeOff } from 'lucide-vue-next'

const router  = useRouter()
const auth    = useAuthStore()
const toast   = useToastStore()
const ui      = useUiStore()

const form    = reactive({ phone: '', password: '' })
const errors  = reactive({ phone: '', password: '' })
const loading = ref(false)
const showPassword = ref(false)

function validate() {
  errors.phone    = ''
  errors.password = ''
  let ok = true
  if (!form.phone.trim()) { errors.phone    = 'Telefon raqam kiritilishi shart'; ok = false }
  if (!form.password)     { errors.password = 'Parol kiritilishi shart';         ok = false }
  return ok
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    const phone = '+998' + form.phone.trim().replace(/\s/g, '')
    await auth.login(phone, form.password)
    toast.success('Xush kelibsiz!')
    await router.push('/')
  } catch (e: any) {
    const msg = e?.response?.data?.detail ?? 'Login yoki parol xato'
    toast.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex transition-colors duration-300 bg-gray-50 dark:bg-[#0a0c10]">

    <!-- Dark mode toggle -->
    <button
      class="fixed top-5 right-5 z-50 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200
             bg-white dark:bg-[#13161f]
             border border-gray-200 dark:border-[#252836]
             text-gray-500 dark:text-gray-400
             hover:bg-gray-50 dark:hover:bg-[#1c1f2e]"
      @click="ui.toggleDark"
    >
      <component :is="ui.isDark ? Sun : Moon" class="w-4 h-4" />
    </button>

    <!-- ── LEFT PANEL ─────────────────────────────── -->
    <div
      class="hidden lg:flex flex-col justify-between w-[50%] relative overflow-hidden p-14"
      :style="ui.isDark
        ? 'background: linear-gradient(145deg, #1e3a5f 0%, #1a2f4e 60%, #152540 100%);'
        : 'background: linear-gradient(145deg, #3b82f6 0%, #2563eb 60%, #1d4ed8 100%);'"
    >
      <!-- Decorative circles -->
      <div class="absolute top-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-20"
           style="background: rgba(255,255,255,0.3)" />
      <div class="absolute bottom-[-80px] left-[-40px] w-72 h-72 rounded-full opacity-15"
           style="background: rgba(255,255,255,0.2)" />
      <div class="absolute top-1/2 right-8 w-16 h-16 rounded-xl opacity-10 rotate-45"
           style="background: rgba(255,255,255,0.5)" />
      <div class="absolute top-1/3 left-8 w-8 h-8 rounded-lg opacity-15 rotate-12"
           style="background: rgba(255,255,255,0.5)" />

      <!-- Logo -->
      <div class="relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
            <span class="text-white font-bold text-lg">F</span>
          </div>
          <div>
            <p class="text-white font-semibold text-base leading-none">FamilyMarket</p>
            <p class="text-blue-100 text-xs mt-0.5">HR Tizimi</p>
          </div>
        </div>
      </div>

      <!-- Hero -->
      <div class="relative z-10 space-y-5">
        <div class="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          <span class="text-xs text-white font-medium">Real-vaqt monitoring</span>
        </div>

        <h1 class="text-4xl font-bold text-white leading-snug">
          Xodimlarni<br />samarali<br />boshqaring
        </h1>

        <p class="text-blue-100 text-sm leading-relaxed max-w-xs">
          Davomat, maosh, KPI va ta'tillarni avtomatlashtiring. Telegram bot bilan nazorat qiling.
        </p>
      </div>

      <!-- Stats -->
      <div class="relative z-10 flex items-center gap-8 pt-6 border-t border-white/20">
        <div v-for="s in [['6+','Rol'],['24/7','Monitoring'],['100%','Avtomat']]" :key="s[0]">
          <p class="text-2xl font-bold text-white">{{ s[0] }}</p>
          <p class="text-xs text-blue-200 mt-0.5">{{ s[1] }}</p>
        </div>
      </div>
    </div>

    <!-- ── RIGHT PANEL ─────────────────────────────── -->
    <div class="flex-1 flex flex-col items-center justify-center p-8 lg:p-16
                bg-gray-50 dark:bg-[#0a0c10]">

      <!-- Mobile logo -->
      <div class="lg:hidden text-center mb-10">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
             style="background: linear-gradient(135deg, #3b82f6, #2563eb)">
          <span class="text-white font-bold text-xl">F</span>
        </div>
        <p class="font-semibold text-gray-900 dark:text-white">FamilyMarket HR</p>
      </div>

      <div class="w-full max-w-sm">

        <!-- Heading -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Xush kelibsiz 👋
          </h2>
          <p class="text-gray-400 dark:text-gray-500 text-sm mt-1.5">
            Hisobingizga kiring
          </p>
        </div>

        <!-- Form card -->
        <div class="bg-white dark:bg-[#13161f] rounded-2xl border border-gray-100 dark:border-[#252836] shadow-sm p-7 space-y-5">

          <!-- Phone -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-gray-600 dark:text-gray-300">
              Telefon raqam
            </label>
            <div
              :class="[
                'flex items-center rounded-xl border-2 transition-all duration-150',
                'bg-gray-50 dark:bg-[#0d1017]',
                errors.phone
                  ? 'border-red-400'
                  : 'border-gray-100 dark:border-[#252836] focus-within:border-blue-400 dark:focus-within:border-blue-500',
              ]"
            >
              <span class="pl-3.5 pr-3 py-3.5 text-xs text-gray-400 font-mono select-none border-r border-gray-100 dark:border-[#252836]">
                +998
              </span>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="90 123 45 67"
                class="flex-1 bg-transparent px-3.5 py-3.5 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none text-sm"
                @keyup.enter="onSubmit"
              />
            </div>
            <p v-if="errors.phone" class="text-xs text-red-500">{{ errors.phone }}</p>
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-gray-600 dark:text-gray-300">
              Parol
            </label>
            <div
              :class="[
                'flex items-center rounded-xl border-2 transition-all duration-150',
                'bg-gray-50 dark:bg-[#0d1017]',
                errors.password
                  ? 'border-red-400'
                  : 'border-gray-100 dark:border-[#252836] focus-within:border-blue-400 dark:focus-within:border-blue-500',
              ]"
            >
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="flex-1 bg-transparent pl-3.5 py-3.5 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none text-sm"
                @keyup.enter="onSubmit"
              />
              <button
                type="button"
                class="pr-3.5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                @click="showPassword = !showPassword"
              >
                <component :is="showPassword ? EyeOff : Eye" class="w-4 h-4" />
              </button>
            </div>
            <p v-if="errors.password" class="text-xs text-red-500">{{ errors.password }}</p>
          </div>

          <!-- Submit — chap panel rangi bilan bir xil -->
          <button
            :disabled="loading"
            class="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-150
                   active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            @click="onSubmit"
          >
            <span v-if="!loading">Kirish</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Kirish...
            </span>
          </button>
        </div>

        <p class="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          FamilyMarket HR © {{ new Date().getFullYear() }}
        </p>
      </div>
    </div>

    <AppToast />
  </div>
</template>