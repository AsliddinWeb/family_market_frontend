<script setup lang="ts">
import { ref } from 'vue'
import { Loader2 } from 'lucide-vue-next'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  iconOnly?: boolean
  tooltip?: string
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  iconOnly: false,
  type: 'button',
})

const btnRef = ref<HTMLButtonElement | null>(null)

function createRipple(e: MouseEvent) {
  const btn = btnRef.value
  if (!btn) return

  const existing = btn.querySelector('.ripple-el')
  existing?.remove()

  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2

  const ripple = document.createElement('span')
  ripple.className = 'ripple-el'
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.3);
    transform: scale(0);
    animation: ripple 500ms ease forwards;
    pointer-events: none;
  `
  btn.appendChild(ripple)
  setTimeout(() => ripple.remove(), 500)
}
</script>

<template>
  <button
    ref="btnRef"
    :type="type"
    :disabled="disabled || loading"
    :title="tooltip"
    :class="[
      'relative overflow-hidden inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:scale-[0.97] select-none',
      // size
      size === 'sm' && !iconOnly && 'px-3 py-1.5 text-sm rounded-lg',
      size === 'md' && !iconOnly && 'px-4 py-2 text-sm rounded-lg',
      size === 'lg' && !iconOnly && 'px-5 py-2.5 text-base rounded-xl',
      // iconOnly
      iconOnly && size === 'sm' && 'w-8 h-8 rounded-lg',
      iconOnly && size === 'md' && 'w-9 h-9 rounded-lg',
      iconOnly && size === 'lg' && 'w-11 h-11 rounded-xl',
      // variant
      variant === 'primary'   && 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm',
      variant === 'secondary' && 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
      variant === 'danger'    && 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
      variant === 'ghost'     && 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300',
      variant === 'outline'   && 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200',
      // disabled
      (disabled || loading) && 'opacity-50 cursor-not-allowed',
    ]"
    @click="createRipple"
  >
    <component :is="Loader2" v-if="loading" class="w-4 h-4 animate-spin" />
    <slot />
  </button>
</template>