<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, EyeOff, X } from 'lucide-vue-next'

interface Props {
  modelValue?: string | number | null
  label?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
  maxlength?: number
  state?: 'default' | 'success' | 'error'
  hint?: string
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  state: 'default',
  clearable: false,
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'clear': []
}>()

const isFocused = ref(false)
const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type !== 'password') return props.type
  return showPassword.value ? 'text' : 'password'
})

const hasValue = computed(() => {
  const v = props.modelValue
  return v !== '' && v !== null && v !== undefined
})

const labelFloated = computed(() => isFocused.value || hasValue.value)

const charCount = computed(() => String(props.modelValue ?? '').length)

const borderClass = computed(() => {
  if (props.state === 'success') return 'border-green-500 focus-within:ring-green-500/20'
  if (props.state === 'error')   return 'border-red-500 focus-within:ring-red-500/20'
  if (isFocused.value)           return 'border-primary-500 focus-within:ring-primary-500/20'
  return 'border-gray-300 dark:border-gray-600'
})

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

function onClear() {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="relative w-full">
    <!-- Input wrapper -->
    <div
      :class="[
        'relative flex items-center rounded-lg border bg-white dark:bg-gray-800 transition-all duration-150 focus-within:ring-2',
        borderClass,
        disabled && 'opacity-50 cursor-not-allowed',
      ]"
    >
      <!-- Floating label -->
      <label
        v-if="label"
        :class="[
          'absolute left-3 transition-all duration-150 pointer-events-none text-gray-500 dark:text-gray-400',
          labelFloated
            ? 'top-1 text-[10px] font-medium'
            : 'top-1/2 -translate-y-1/2 text-sm',
          state === 'success' && labelFloated && 'text-green-500',
          state === 'error'   && labelFloated && 'text-red-500',
          isFocused && state === 'default' && labelFloated && 'text-primary-500',
        ]"
      >
        {{ label }}<span v-if="required" class="text-red-400 ml-0.5">*</span>
      </label>

      <!-- Input -->
      <input
        :type="inputType"
        :value="modelValue"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :placeholder="!label ? placeholder : undefined"
        :class="[
          'w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none px-3',
          label ? 'pt-5 pb-1.5' : 'py-2.5',
          (clearable || type === 'password') ? 'pr-8' : '',
        ]"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @input="onInput"
      />

      <!-- Right icons -->
      <div class="flex items-center pr-2 gap-1 shrink-0">
        <!-- Clear button -->
        <button
          v-if="clearable && hasValue && !disabled"
          type="button"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded"
          @click="onClear"
        >
          <component :is="X" class="w-3.5 h-3.5" />
        </button>

        <!-- Password toggle -->
        <button
          v-if="type === 'password'"
          type="button"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded"
          @click="showPassword = !showPassword"
        >
          <component :is="showPassword ? EyeOff : Eye" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Bottom row: hint + char counter -->
    <div class="flex justify-between items-center mt-1 px-1">
      <p
        v-if="hint"
        :class="[
          'text-xs',
          state === 'error'   && 'text-red-500',
          state === 'success' && 'text-green-500',
          state === 'default' && 'text-gray-400',
        ]"
      >
        {{ hint }}
      </p>
      <p v-if="maxlength" class="text-xs text-gray-400 ml-auto">
        {{ charCount }}/{{ maxlength }}
      </p>
    </div>
  </div>
</template>