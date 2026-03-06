import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  type: ToastType
  message: string
  duration: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let counter = 0

  function add(type: ToastType, message: string, duration = 4000) {
    const id = ++counter
    toasts.value.push({ id, type, message, duration })
    setTimeout(() => remove(id), duration)
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const success = (msg: string, dur?: number) => add('success', msg, dur)
  const error   = (msg: string, dur?: number) => add('error', msg, dur)
  const warning = (msg: string, dur?: number) => add('warning', msg, dur)
  const info    = (msg: string, dur?: number) => add('info', msg, dur)

  return { toasts, add, remove, success, error, warning, info }
})