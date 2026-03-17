<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sun, Moon, Bell, ChevronDown, User, LogOut, KeyRound, Menu, RefreshCw } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'

const ui = useUiStore()
const { isRole } = usePermission()
const isEmployee = computed(() => isRole.value('employee'))
const auth = useAuthStore()
const router = useRouter()

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

onClickOutside(dropdownRef, () => { dropdownOpen.value = false })

const roleLabels: Record<string, string> = {
  superadmin:     'Super Admin',
  admin:          'Admin',
  hr_manager:     'HR Menejer',
  branch_manager: 'Filial Menejer',
  accountant:     'Buxgalter',
  employee:       'Xodim',
}

async function logout() {
  auth.logout()
  await router.push('/login')
}

function refresh() {
  window.location.reload()
}
</script>

<template>
  <header class="h-16 bg-white dark:bg-[#1a1d27] border-b border-gray-100 dark:border-[#2d3148] flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-20">

    <!-- Left: mobile hamburger -->
    <button
      class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
      @click="ui.openDrawer"
    >
      <component :is="Menu" class="w-5 h-5" />
    </button>

    <!-- Left: spacer desktop -->
    <div class="hidden lg:block" />

    <!-- Right: actions -->
    <div class="flex items-center gap-2">

      <!-- Yangilash (faqat employee, mobile) -->
      <button
        v-if="isEmployee"
        class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232736] transition-colors"
        @click="refresh"
      >
        <RefreshCw class="w-4 h-4" />
      </button>

      <!-- Dark mode toggle -->
      <button
        class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232736] transition-colors"
        @click="ui.toggleDark"
      >
        <component :is="ui.isDark ? Sun : Moon" class="w-4 h-4" />
      </button>

      <!-- Notification bell -->
      <button class="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232736] transition-colors">
        <component :is="Bell" class="w-4 h-4" />
        <span
          v-if="ui.notificationCount > 0"
          class="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5"
        >
          {{ ui.notificationCount > 99 ? '99+' : ui.notificationCount }}
        </span>
      </button>

      <!-- Avatar dropdown -->
      <div ref="dropdownRef" class="relative">
        <button
          class="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#232736] transition-colors"
          @click="dropdownOpen = !dropdownOpen"
        >
          <div class="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center">
            <span class="text-primary-600 dark:text-primary-400 text-xs font-semibold">
              {{ auth.user?.phone?.slice(0, 2) ?? 'U' }}
            </span>
          </div>
          <div class="hidden sm:flex flex-col items-start leading-none">
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">
              {{ auth.user?.phone ?? 'Foydalanuvchi' }}
            </span>
            <span class="text-[11px] text-gray-400 mt-0.5">
              {{ roleLabels[auth.user?.role ?? ''] ?? auth.user?.role }}
            </span>
          </div>
          <component :is="ChevronDown" :class="['w-3.5 h-3.5 text-gray-400 transition-transform duration-150', dropdownOpen && 'rotate-180']" />
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-1"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-1"
        >
          <div
            v-if="dropdownOpen"
            class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1a1d27] rounded-xl border border-gray-100 dark:border-[#2d3148] shadow-lg py-1 z-30"
          >
            <RouterLink
              to="/settings"
              class="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232736] transition-colors"
              @click="dropdownOpen = false"
            >
              <component :is="User" class="w-4 h-4 text-gray-400" />
              Profil
            </RouterLink>
            <RouterLink
              to="/settings"
              class="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232736] transition-colors"
              @click="dropdownOpen = false"
            >
              <component :is="KeyRound" class="w-4 h-4 text-gray-400" />
              Parol o'zgartirish
            </RouterLink>
            <div class="my-1 border-t border-gray-100 dark:border-[#2d3148]" />
            <button
              class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              @click="logout"
            >
              <component :is="LogOut" class="w-4 h-4" />
              Chiqish
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>