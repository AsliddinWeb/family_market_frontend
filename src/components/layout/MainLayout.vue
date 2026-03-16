<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'
import MobileDrawer from './MobileDrawer.vue'
import EmployeeBottomNav from './EmployeeBottomNav.vue'
import AppToast from '@/components/ui/AppToast.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[--color-bg]">

    <!-- Desktop Sidebar -->
    <Sidebar />

    <!-- Main area -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">

      <!-- Topbar -->
      <Topbar />

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-6">
        <RouterView v-slot="{ Component }">
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <!-- Mobile Drawer (non-employee) -->
    <MobileDrawer />

    <!-- Employee Bottom Nav (mobile only) -->
    <EmployeeBottomNav />

    <!-- Global -->
    <AppToast />
    <ConfirmDialog />
  </div>
</template>