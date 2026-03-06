<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard, Users, Building2, FolderOpen,
  Clock, DollarSign, Gift, BarChart2, Umbrella,
  Settings, X,
} from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const route = useRoute()

// Route o'zgarganda drawer yopilsin
watch(() => route.path, () => ui.closeDrawer())

const navItems = [
  { label: 'Dashboard',     to: '/',                 icon: LayoutDashboard },
  { label: 'Xodimlar',      to: '/employees',        icon: Users           },
  { label: 'Filiallar',     to: '/branches',         icon: Building2       },
  { label: "Bo'limlar",     to: '/departments',      icon: FolderOpen      },
  { label: 'Davomat',       to: '/attendance',       icon: Clock           },
  { label: 'Oylik',         to: '/salary',           icon: DollarSign      },
  { label: 'Bonus/Jarima',  to: '/bonus-deductions', icon: Gift            },
  { label: 'KPI',           to: '/kpi',              icon: BarChart2       },
  { label: "Ta'tillar",     to: '/leaves',           icon: Umbrella        },
  { label: 'Sozlamalar',    to: '/settings',         icon: Settings        },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="ui.mobileDrawerOpen"
        class="fixed inset-0 z-40 lg:hidden"
      >
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="ui.closeDrawer"
        />

        <!-- Drawer panel -->
        <Transition
          enter-active-class="transition duration-300 ease-spring"
          enter-from-class="-translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="translate-x-0"
          leave-to-class="-translate-x-full"
          appear
        >
          <div
            v-if="ui.mobileDrawerOpen"
            class="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#1a1d27] flex flex-col shadow-xl"
          >
            <!-- Header -->
            <div class="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-[#2d3148] shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                  <span class="text-white font-bold text-sm">F</span>
                </div>
                <span class="font-semibold text-gray-900 dark:text-gray-100">FamilyMarket</span>
              </div>
              <button
                class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                @click="ui.closeDrawer"
              >
                <component :is="X" class="w-4 h-4" />
              </button>
            </div>

            <!-- Nav -->
            <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              <RouterLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                :class="[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative',
                  isActive(item.to)
                    ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-[--color-hover] hover:text-gray-900 dark:hover:text-gray-100',
                ]"
              >
                <span
                  v-if="isActive(item.to)"
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-r-full"
                />
                <component :is="item.icon" class="w-4 h-4 shrink-0" />
                {{ item.label }}
              </RouterLink>
            </nav>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>