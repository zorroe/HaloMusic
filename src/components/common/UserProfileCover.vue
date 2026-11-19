<template>
  <div class="flex flex-col w-40 h-52">
    <div class="cover group cursor-pointer">
      <lmg
        :src="props.data.avatarUrl"
        :width="300"
        :height="300"
        class="w-40 h-40 rounded-full"
        @click="handleOpenProfile"></lmg>
    </div>
    <div
      class="text-center cursor-pointer mt-2 text-base font-bold hover:decoration-black hover:underline truncate"
      @click="handleOpenProfile">
      {{ props.data.nickname }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from '@/types/userRel'
import { openUrl } from '@/utils/common'

/* 用户头像组件 */
interface Props {
  data: UserProfile
}

const props = defineProps<Props>()

const handleOpenProfile = () => {
  if (!props.data?.userId) return
  openUrl(`https://music.163.com/#/user/home?id=${props.data.userId}`)
}
</script>

<style scoped></style>
