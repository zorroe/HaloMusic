<template>
  <div class="notfound-page">
    <div class="notfound-art">
      <span
        class="notfound-glow"
        aria-hidden="true"></span>
      <span
        class="notfound-code"
        aria-hidden="true">404</span>
    </div>

    <div class="notfound-body">
      <h1 class="notfound-title">这个页面走丢了</h1>
      <p class="notfound-desc">
        你访问的地址不存在，或者已经被移除。回到首页，继续听歌吧。
      </p>
      <div class="notfound-actions">
        <button
          type="button"
          class="pill-btn pill-btn--primary"
          @click="goHome">
          回到首页
        </button>
        <button
          type="button"
          class="pill-btn"
          @click="goBack">
          返回上一页
        </button>
      </div>
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

<style scoped>
.notfound-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  min-height: 60vh;
  padding: clamp(24px, 8vh, 80px) 0;
  text-align: center;
}

/* 装饰：大号 404 + 背后主色光晕 */
.notfound-art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notfound-glow {
  position: absolute;
  width: clamp(180px, 26vw, 300px);
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-full);
  background: radial-gradient(
    circle,
    var(--color-primary-bg) 0%,
    transparent 68%
  );
  pointer-events: none;
}

.notfound-code {
  position: relative;
  font-size: clamp(88px, 12vw, 148px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.05em;
  background: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    color-mix(in srgb, var(--color-primary) 45%, var(--color-text)) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  user-select: none;
}

.notfound-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 26rem;
}

.notfound-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.notfound-desc {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.notfound-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}
</style>
