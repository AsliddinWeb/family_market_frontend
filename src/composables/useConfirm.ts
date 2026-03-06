import { ref } from 'vue'

export type ConfirmType = 'danger' | 'warning' | 'info'

interface ConfirmOptions {
  title: string
  message: string
  type?: ConfirmType
  confirmText?: string
  cancelText?: string
}

interface ConfirmState extends ConfirmOptions {
  visible: boolean
  resolve: ((value: boolean) => void) | null
}

const state = ref<ConfirmState>({
  visible: false,
  title: '',
  message: '',
  type: 'danger',
  confirmText: 'Tasdiqlash',
  cancelText: 'Bekor qilish',
  resolve: null,
})

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = {
        ...options,
        type: options.type ?? 'danger',
        confirmText: options.confirmText ?? 'Tasdiqlash',
        cancelText: options.cancelText ?? 'Bekor qilish',
        visible: true,
        resolve,
      }
    })
  }

  function onConfirm() {
    state.value.resolve?.(true)
    state.value.visible = false
  }

  function onCancel() {
    state.value.resolve?.(false)
    state.value.visible = false
  }

  return { state, confirm, onConfirm, onCancel }
}