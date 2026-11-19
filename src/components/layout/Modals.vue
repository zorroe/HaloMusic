<template>
  <ea-modal
    id="logout-modal"
    @confirm="handleLogout">
    <h3 class="font-bold text-lg">确定退出登陆吗？</h3>
  </ea-modal>
</template>

<script setup lang="ts">
import { doLogout } from '@/utils/common'
import notify from '@/components/common/notification/notify'

defineOptions({
  name: 'modals',
})

const handleLogout = async () => {
  try {
    await doLogout()
  } catch (error) {
    console.error('[HaloMusic] logout failed:', error)
    notify({ message: '退出登录失败，请稍后重试', type: 'error' })
  }
}
</script>

<style scoped></style>
