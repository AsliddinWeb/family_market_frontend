<script setup lang="ts">
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const icons = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}

const colors = {
  success: 'text-green-500',
  error:   'text-red-500',
  warning: 'text-amber-500',
  info:    'text-blue-500',
}

const bars = {
  success: 'bg-green-500',
  error:   'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-500',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-full"
      >
        <div
          v-for="t in toast.toasts"
          :key="t.id"
          class="relative overflow-hidden flex items-start gap-3 bg-white dark:bg-[#1a1d27] rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4"
        >
          <!-- Left color bar -->
          <div :class="['absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', bars[t.type]]" />

          <!-- Icon -->
          <component
            :is="icons[t.type]"
            :class="['w-5 h-5 shrink-0 mt-0.5', colors[t.type]]"
          />

          <!-- Message -->
          <p class="text-sm text-gray-700 dark:text-gray-200 flex-1 leading-snug">
            {{ t.message }}
          </p>

          <!-- Close -->
          <button
            class="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition-colors shrink-0"
            @click="toast.remove(t.id)"
          >
            <component :is="X" class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>