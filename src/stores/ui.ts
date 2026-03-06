import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // Dark mode
  const isDark = ref<boolean>(localStorage.getItem('theme') === 'dark')

  function toggleDark() {
    isDark.value = !isDark.value
  }

  watch(isDark, (val) => {
    localStorage.setItem('theme', val ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', val)
  }, { immediate: true })

  // Sidebar
  const sidebarCollapsed = ref<boolean>(
    localStorage.getItem('sidebar_collapsed') === 'true',
  )

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed.value))
  }

  // Mobile drawer
  const mobileDrawerOpen = ref(false)

  function openDrawer()  { mobileDrawerOpen.value = true }
  function closeDrawer() { mobileDrawerOpen.value = false }

  // Notifications (placeholder)
  const notificationCount = ref(0)

  return {
    isDark, toggleDark,
    sidebarCollapsed, toggleSidebar,
    mobileDrawerOpen, openDrawer, closeDrawer,
    notificationCount,
  }
})