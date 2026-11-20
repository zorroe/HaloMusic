<template>
  <div class="page">
    <!-- 加载骨架 -->
    <div v-if="!loaded && !loadFailed" class="page-loading" aria-busy="true">
      <div class="page-head">
        <div class="detail-head">
          <ea-skeleton variant="circle" :width="96" :height="96" />
          <div>
            <ea-skeleton variant="rect" width="16rem" height="34px" />
            <ea-skeleton variant="text" width="8rem" class="mt-3" />
          </div>
        </div>
      </div>
      <div class="flex flex-col">
        <ea-skeleton
          v-for="index in 10"
          :key="`skeleton-track-${index}`"
          variant="row"
        />
      </div>
    </div>

    <ea-empty
      v-else-if="loadFailed"
      title="歌曲列表加载失败"
      description="请检查网络后重试"
      action-text="重新加载"
      @action="loadAll"
    />

    <template v-else>
      <header class="page-head">
        <div class="detail-head">
          <div class="detail-cover">
            <lmg
              :src="artistCover"
              :width="200"
              :height="200"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="page-head-main">
            <h1 class="page-title">
              {{ artistName ? `${artistName}的全部歌曲` : '全部歌曲' }}
            </h1>
            <p class="page-subtitle">
              共 {{ total }} 首<template v-if="totalPage > 1">
                · 第 {{ currentPage }} / {{ totalPage }} 页
              </template>
            </p>
          </div>
        </div>
      </header>

      <section class="section" :aria-busy="loadingPage ? 'true' : 'false'">
        <music-table v-if="tracks.length" :data="tracks" />
        <ea-empty
          v-else
          title="这位歌手还没有歌曲"
          description="换个歌手听听吧"
        />

        <!-- 分页：保留原来的翻页逻辑，只换外观 -->
        <div v-if="totalPage > 1 && tracks.length" class="pager">
          <button
            type="button"
            class="pill-btn pill-btn--icon"
            :disabled="currentPage === 1 || loadingPage"
            aria-label="上一页"
            @click="prePage"
          >
            <icon-park :icon="Left" theme="outline" :size="16" />
          </button>
          <span class="pager-text">
            {{ currentPage }}
            <span class="pager-sep">/</span>
            {{ totalPage }}
          </span>
          <button
            type="button"
            class="pill-btn pill-btn--icon"
            :disabled="currentPage === totalPage || loadingPage"
            aria-label="下一页"
            @click="nextPage"
          >
            <icon-park :icon="Right" theme="outline" :size="16" />
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Left, Right } from '@icon-park/vue-next'
import { getArtistDetailApi, getSongsByArtistIdApi } from '@/api/artist'
import type { MusicBaseInfo } from '@/types/musicRel'
import { handleRequestError } from '@/utils/common'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'artistTrack',
})

const route = useRoute()

const PAGE_SIZE = 50

const artistId = computed(() => String(route.params.id ?? ''))
const artistName = ref('')
const artistCover = ref('')
const tracks = ref<MusicBaseInfo[]>([])
const total = ref(0)
const currentPage = ref(1)
const loaded = ref(false)
const loadFailed = ref(false)
const loadingPage = ref(false)

const totalPage = computed(() =>
  Math.max(1, Math.ceil(total.value / PAGE_SIZE))
)

const getArtistInfo = async () => {
  const { data } = await getArtistDetailApi({ id: artistId.value })
  artistName.value = data?.artist?.name ?? ''
  artistCover.value = data?.artist?.cover ?? ''
}

const getAllTracks = async () => {
  const { songs, total: count } = await getSongsByArtistIdApi({
    id: artistId.value,
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
  })
  tracks.value = (songs ?? []).map(mapSong)
  total.value = typeof count === 'number' ? count : tracks.value.length
}

const loadAll = async () => {
  loaded.value = false
  loadFailed.value = false
  try {
    await Promise.all([getArtistInfo(), getAllTracks()])
    loaded.value = true
  } catch (error) {
    console.error('[HaloMusic] load artist tracks failed:', error)
    loadFailed.value = true
    handleRequestError(error, '歌曲列表加载失败，请稍后重试')
  }
}

const changePage = async (page: number) => {
  if (loadingPage.value) return
  const next = Math.min(Math.max(1, page), totalPage.value)
  if (next === currentPage.value) return
  loadingPage.value = true
  currentPage.value = next
  try {
    await getAllTracks()
  } catch (error) {
    console.error('[HaloMusic] load tracks page failed:', error)
    handleRequestError(error, '翻页失败，请稍后重试')
  } finally {
    loadingPage.value = false
  }
}

const prePage = () => {
  void changePage(currentPage.value - 1)
}

const nextPage = () => {
  void changePage(currentPage.value + 1)
}

// 该页被 keep-alive 缓存，切换到另一个歌手时仅 params 变化，需要重新拉取
watch(artistId, () => {
  currentPage.value = 1
  loadAll()
})

onMounted(loadAll)
</script>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 详情页头的紧凑版：圆形小头像 + 标题/副标题 */
.detail-head {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.detail-cover {
  flex: none;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background-color: var(--color-secondary-bg);
  box-shadow: var(--shadow-sm);
}

.page-head-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 翻页按钮沿用胶囊按钮，禁用态降低存在感 */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-top: 8px;
}

.pill-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pill-btn:disabled:hover {
  background-color: var(--color-card-bg);
  border-color: var(--color-border);
}

.pager-text {
  min-width: 64px;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.pager-sep {
  margin: 0 4px;
  color: var(--color-text-subtle);
}
</style>
