<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { AlertTriangle, AlertCircle, Info } from 'lucide-vue-next'
import { useConfirm } from '@/composables/useConfirm'
import AppButton from './AppButton.vue'

const { state, onConfirm, onCancel } = useConfirm()

const topBarColors = {
  danger:  'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-500',
}

const icons = {
  danger:  AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

const iconColors = {
  danger:  'text-red-500',
  warning: 'text-amber-500',
  info:    'text-blue-500',
}

const confirmVariants = {
  danger:  'danger',
  warning: 'primary',
  info:    'primary',
} as const

function onKeydown(e: KeyboardEvent) {
  if (!state.value.visible) return
  if (e.key === 'Enter')  onConfirm()
  if (e.key === 'Escape') onCancel()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
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
        v-if="state.visible"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="onCancel" />

        <!-- Dialog -->
        <Transition
          enter-active-class="duration-300 ease-spring"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          appear
        >
          <div
            v-if="state.visible"
            class="relative z-10 w-full max-w-sm bg-white dark:bg-[#1a1d27] rounded-2xl shadow-xl overflow-hidden"
          >
            <!-- Top accent bar -->
            <div :class="['h-1 w-full', topBarColors[state.type ?? 'danger']]" />

            <div class="p-6">
              <!-- Icon + Title -->
              <div class="flex items-start gap-4 mb-3">
                <div
                  :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    state.type === 'danger'  && 'bg-red-100 dark:bg-red-900/30',
                    state.type === 'warning' && 'bg-amber-100 dark:bg-amber-900/30',
                    state.type === 'info'    && 'bg-blue-100 dark:bg-blue-900/30',
                  ]"
                >
                  <component
                    :is="icons[state.type ?? 'danger']"
                    :class="['w-5 h-5', iconColors[state.type ?? 'danger']]"
                  />
                </div>
                <div>
                  <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {{ state.title }}
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ state.message }}
                  </p>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 justify-end mt-5">
                <AppButton variant="ghost" size="sm" @click="onCancel">
                  {{ state.cancelText }}
                </AppButton>
                <AppButton
                  :variant="confirmVariants[state.type ?? 'danger']"
                  size="sm"
                  @click="onConfirm"
                >
                  {{ state.confirmText }}
                </AppButton>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>