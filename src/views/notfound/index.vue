<template>
  <div class="flex flex-col items-center justify-center gap-6 py-24">
    <div class="text-8xl font-black text-[var(--color-border-strong)] select-none">404</div>
    <div class="text-xl font-bold">这个页面走丢了</div>
    <div class="text-base text-[var(--color-text-muted)]">
      你访问的地址不存在，或者已经被移除
    </div>
    <div class="flex gap-4 mt-2">
      <ea-button
        type="primary"
        @click="goHome">
        <div class="text-base font-bold">回到首页</div>
      </ea-button>
      <ea-button
        type="info"
        @click="goBack">
        <div class="text-base font-bold">返回上一页</div>
      </ea-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

defineOptions({
  name: 'notFound',
})

const router = useRouter()

const goHome = () => {
  router.replace('/')
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}
</script>

<style scoped></style>
