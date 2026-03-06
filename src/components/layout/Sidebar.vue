<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard, Users, Building2, FolderOpen,
  Clock, DollarSign, Gift, BarChart2, Umbrella,
  Settings, ChevronLeft, ChevronRight,
} from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const route = useRoute()

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
  <aside
    :class="[
      'hidden lg:flex flex-col h-screen sticky top-0 bg-white dark:bg-[#1a1d27] border-r border-gray-100 dark:border-[#2d3148] transition-all duration-300 shrink-0',
      ui.sidebarCollapsed ? 'w-16' : 'w-64',
    ]"
  >
    <!-- Logo -->
    <div class="h-16 flex items-center px-4 border-b border-gray-100 dark:border-[#2d3148] shrink-0 overflow-hidden">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
          <span class="text-white font-bold text-sm">F</span>
        </div>
        <Transition
          enter-active-class="transition duration-200"
          enter-from-class="opacity-0 -translate-x-2"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition duration-150"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <span v-if="!ui.sidebarCollapsed" class="font-semibold text-gray-900 dark:text-gray-100 truncate">
            FamilyMarket
          </span>
        </Transition>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      <div
        v-for="item in navItems"
        :key="item.to"
        class="relative group"
      >
        <RouterLink
          :to="item.to"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative overflow-hidden',
            isActive(item.to)
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-[--color-hover] hover:text-gray-900 dark:hover:text-gray-100 hover:translate-x-0.5',
            ui.sidebarCollapsed && 'justify-center px-2',
          ]"
        >
          <!-- Active left accent bar -->
          <span
            v-if="isActive(item.to)"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-r-full"
          />

          <!-- Icon -->
          <component
            :is="item.icon"
            :class="[
              'shrink-0 transition-colors',
              ui.sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4',
              isActive(item.to) ? 'text-primary-500' : '',
            ]"
          />

          <!-- Label -->
          <Transition
            enter-active-class="transition duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <span v-if="!ui.sidebarCollapsed" class="truncate">{{ item.label }}</span>
          </Transition>
        </RouterLink>

        <!-- Collapsed tooltip -->
        <div
          v-if="ui.sidebarCollapsed"
          class="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          <div class="relative bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            <!-- Arrow -->
            <span class="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
            {{ item.label }}
          </div>
        </div>
      </div>
    </nav>

    <!-- Collapse toggle button -->
    <button
      class="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-[#2d3148] flex items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-[#232736] transition-all duration-150 z-10"
      @click="ui.toggleSidebar"
    >
      <component
        :is="ui.sidebarCollapsed ? ChevronRight : ChevronLeft"
        class="w-3.5 h-3.5 text-gray-500"
      />
    </button>
  </aside>
</template>