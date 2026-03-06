<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  persistent?: boolean // ESC bilan yopilmasin
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  persistent: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}

function onBackdrop() {
  if (!props.persistent) close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !props.persistent) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

const sizeClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}[props.size]))
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
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="onBackdrop"
        />

        <!-- Modal panel -->
        <Transition
          enter-active-class="duration-300 ease-spring"
          enter-from-class="opacity-0 translate-y-full lg:translate-y-0 lg:scale-95"
          enter-to-class="opacity-100 translate-y-0 lg:scale-100"
          leave-active-class="duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 lg:scale-100"
          leave-to-class="opacity-0 translate-y-full lg:translate-y-0 lg:scale-95"
          appear
        >
          <div
            v-if="modelValue"
            :class="[
              'relative z-10 w-full bg-white dark:bg-[#1a1d27] shadow-xl flex flex-col max-h-[90vh]',
              // Mobile: bottom sheet
              'rounded-t-2xl lg:rounded-2xl',
              sizeClass,
            ]"
          >
            <!-- Drag handle (mobile) -->
            <div class="lg:hidden flex justify-center pt-3 pb-1">
              <div class="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            <!-- Header -->
            <div
              v-if="title || $slots.header"
              class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0"
            >
              <slot name="header">
                <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {{ title }}
                </h3>
              </slot>
              <button
                class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
                @click="close"
              >
                <component :is="X" class="w-4 h-4" />
              </button>
            </div>

            <!-- Body -->
            <div class="overflow-y-auto flex-1 px-5 py-4">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.footer"
              class="px-5 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>