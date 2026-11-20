<template>
  <div class="personal-fm">
    <img
      v-if="bgImg"
      :src="bgImg"
      class="personal-fm__bg"
      alt=""
      @error="handleBgError" />
    <span
      class="personal-fm__shade"
      aria-hidden="true"></span>
    <div class="personal-fm__body">
      <span class="personal-fm__eyebrow">私人 FM</span>
      <span class="personal-fm__title">为你持续推荐</span>
      <span class="personal-fm__meta">根据听歌口味随机播放，不限数量</span>
      <div class="personal-fm__actions">
        <button
          type="button"
          class="pill-btn personal-fm__play"
          @click="handlePlayFm">
          <icon-park
            :icon="PlayOne"
            :size="15"
            theme="filled"
            fill="currentColor" />
          开始播放
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PlayOne } from '@icon-park/vue-next'
import { personFmApi } from '@/api/music'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { normalizeImageUrl } from '@/views/shared/mappers'

const playerStore = usePlayerStore(pinia)

/** 没有可用封面时用品牌渐变兜底，卡片不会出现破图/空块 */
const bgImg = ref<string>('')

/**
 * 只负责取背景封面：接口失败/结构异常都保留渐变兜底，
 * 真正播放由播放器 store 的 playFm 负责（它有完整的失败回退逻辑）。
 */
const loadFmCover = async () => {
  try {
    const res = await personFmApi()
    const list = Array.isArray(res?.data) ? res.data : []
    const first = list[0]
    // 私人 FM 同时存在新旧两种歌曲结构：album.picUrl（新）与 al.picUrl（旧）
    const legacyPicUrl = (
      first as { al?: { picUrl?: unknown } } | undefined
    )?.al?.picUrl
    const picUrl = first?.album?.picUrl ?? legacyPicUrl
    // 统一转 https：生产环境 CSP 只放行 https 图片，http 封面会加载失败
    const normalized =
      typeof picUrl === 'string' && picUrl ? normalizeImageUrl(picUrl) : ''
    if (normalized) bgImg.value = normalized
  } catch {
    bgImg.value = ''
  }
}

/** 封面加载失败（CSP / 防盗链）时退回渐变，不留破图 */
const handleBgError = () => {
  bgImg.value = ''
}

const handlePlayFm = () => {
  void playerStore.playFm()
}

onMounted(() => {
  void loadFmCover()
})
</script>

<style scoped>
/* 尺寸由使用方（英雄区卡片）控制，这里只保证铺满并裁切 */
.personal-fm {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 168px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  /* 无封面时的品牌渐变兜底（有封面时会被图片盖住） */
  background-image: linear-gradient(
    130deg,
    var(--color-primary) 0%,
    color-mix(in srgb, var(--color-primary) 45%, var(--color-body-bg)) 100%
  );
  color: var(--color-on-primary);
}

.personal-fm__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--motion-slow) var(--ease-standard);
}

.personal-fm:hover .personal-fm__bg {
  transform: scale(1.04);
}

.personal-fm__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    color-mix(in srgb, var(--color-mask) 94%, transparent) 0%,
    color-mix(in srgb, var(--color-mask) 52%, transparent) 58%,
    transparent 100%
  );
}

.personal-fm__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  width: 100%;
  padding: 20px 22px;
}

.personal-fm__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.86;
}

.personal-fm__title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.personal-fm__meta {
  font-size: 13px;
  color: color-mix(in srgb, var(--color-on-primary) 78%, transparent);
}

.personal-fm__actions {
  margin-top: 10px;
}

/* 叠在图片上的主按钮：半透明白 + 模糊，深浅色主题都成立 */
.personal-fm__play {
  border-color: transparent;
  background-color: color-mix(in srgb, var(--color-on-primary) 18%, transparent);
  color: var(--color-on-primary);
  backdrop-filter: blur(6px);
}

.personal-fm__play:hover {
  background-color: color-mix(
    in srgb,
    var(--color-on-primary) 30%,
    transparent
  );
}
</style>
