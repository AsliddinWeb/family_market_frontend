<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShieldOff, ArrowLeft, Home } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1117] px-4">
    <div class="text-center max-w-md">

      <!-- Icon -->
      <div class="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
        <ShieldOff class="w-10 h-10 text-red-500" />
      </div>

      <!-- Text -->
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">403</h1>
      <p class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Ruxsat yo'q</p>
      <p class="text-sm text-gray-400 mb-8">
        Sizning rolingiz (<span class="font-mono text-primary-500">{{ auth.user?.role }}</span>)
        bu sahifaga kirish huquqiga ega emas.
      </p>

      <!-- Actions -->
      <div class="flex items-center justify-center gap-3">
        <AppButton variant="ghost" @click="router.back()">
          <ArrowLeft class="w-4 h-4" />
          Orqaga
        </AppButton>
        <AppButton variant="primary" @click="router.push('/')">
          <Home class="w-4 h-4" />
          Dashboardga
        </AppButton>
      </div>

    </div>
  </div>
</template>