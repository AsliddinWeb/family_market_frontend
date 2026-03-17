<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboard, Clock, Umbrella } from 'lucide-vue-next'
import { usePermission } from '@/composables/usePermission'

const route  = useRoute()
const router = useRouter()
const { isRole } = usePermission()

const isEmployee = computed(() => isRole.value('employee'))

const tabs = [
  { to: '/',           icon: LayoutDashboard, label: 'Bosh sahifa' },
  { to: '/attendance', icon: Clock,           label: 'Davomat'     },
  { to: '/leaves',     icon: Umbrella,        label: "Ta'til"      },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <nav v-if="isEmployee"
    class="fixed bottom-0 left-0 right-0 z-40 lg:hidden
           bg-white dark:bg-[#1a1d27] border-t border-gray-100 dark:border-gray-700
           flex items-stretch"
  >
    <button
      v-for="tab in tabs"
      :key="tab.to"
      class="flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1 transition-colors"
      :class="isActive(tab.to)
        ? 'text-primary-500'
        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
      @click="router.push(tab.to)"
    >
      <component :is="tab.icon" class="w-6 h-6" />
      <span class="text-xs font-medium">{{ tab.label }}</span>
    </button>
  </nav>
</template>