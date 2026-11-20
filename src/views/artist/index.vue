<template>
  <div class="page">
    <!-- 加载骨架 -->
    <div v-if="!loaded && !loadFailed" class="page-loading" aria-busy="true">
      <div class="detail-head">
        <ea-skeleton variant="circle" :width="176" :height="176" />
        <div class="detail-info">
          <ea-skeleton
            variant="rect"
            width="4rem"
            height="20px"
            radius="var(--radius-full)"
          />
          <ea-skeleton variant="rect" width="12rem" height="34px" />
          <ea-skeleton variant="text" width="50%" />
          <ea-skeleton variant="text" width="70%" />
          <div class="detail-actions">
            <ea-skeleton
              variant="rect"
              width="7.5rem"
              height="34px"
              radius="var(--radius-full)"
            />
            <ea-skeleton
              variant="rect"
              width="6rem"
              height="34px"
              radius="var(--radius-full)"
            />
          </div>
        </div>
      </div>
      <div class="flex flex-col">
        <ea-skeleton
          v-for="index in 5"
          :key="`skeleton-hot-song-${index}`"
          variant="row"
        />
      </div>
      <div class="grid-cards grid-cards--lg">
        <ea-skeleton
          v-for="index in 10"
          :key="`skeleton-artist-album-${index}`"
          variant="card"
        />
      </div>
    </div>

    <ea-empty
      v-else-if="loadFailed"
      title="歌手信息加载失败"
      description="可能是网络异常或歌手不存在"
      action-text="重新加载"
      @action="loadAll"
    />

    <template v-else>
      <!-- 统一详情页头：圆形大头像 + 类型徽标 / 标题 / 元信息 / 可折叠简介 / 操作区 -->
      <header class="page-head">
        <div class="detail-head">
          <div class="detail-cover detail-cover--round">
            <lmg
              :src="artistInfo?.artist?.cover"
              :width="400"
              :height="400"
              class="w-full h-full object-cover"
            />
          </div>

          <div class="detail-info">
            <span class="detail-badge">歌手</span>

            <h1
              class="page-title detail-title"
              :title="artistInfo?.artist?.name"
            >
              {{ artistInfo?.artist?.name }}
            </h1>

            <p class="page-subtitle">
              <template v-if="artistInfo?.identify?.imageDesc">
                <span>{{ artistInfo?.identify?.imageDesc }}</span>
                <span class="detail-dot">·</span>
              </template>
              <span>{{ artistStats }}</span>
            </p>

            <template v-if="descriptionText">
              <p
                ref="descRef"
                class="detail-desc"
                :class="{ 'detail-desc--expanded': descExpanded }"
              >
                {{ descriptionText }}
              </p>
              <button
                v-if="descOverflow"
                type="button"
                class="detail-desc-toggle"
                @click="descExpanded = !descExpanded"
              >
                {{ descExpanded ? '收起' : '展开' }}
              </button>
            </template>

            <div class="detail-actions">
              <button
                type="button"
                class="pill-btn pill-btn--primary"
                @click="handlePlayAll"
              >
                <icon-park :icon="PlayOne" theme="filled" :size="16" />
                播放全部
              </button>
              <button
                type="button"
                class="pill-btn"
                :title="isStarArtist ? '取消关注' : '关注歌手'"
                @click="starArtist"
              >
                <icon-park
                  :icon="Like"
                  :theme="isStarArtist ? 'filled' : 'outline'"
                  :size="16"
                />
                {{ isStarArtist ? '已关注' : '关注' }}
              </button>
              <button
                type="button"
                class="pill-btn pill-btn--icon"
                title="在浏览器中打开"
                aria-label="在浏览器中打开"
                @click="handleOpenInBrowser"
              >
                <icon-park :icon="BrowserSafari" theme="filled" :size="16" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- 热门歌曲 -->
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">热门歌曲</h2>
          <span
            class="ea-link section-more"
            @click="routeTo('/artistTracks/' + artistId)"
          >
            查看全部
          </span>
        </div>
        <music-table v-if="artistHotSongs.length" :data="artistHotSongs" />
        <ea-empty v-else compact title="暂无热门歌曲" />
      </section>

      <!-- 专辑 -->
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">专辑</h2>
        </div>
        <div v-if="artistHotAlbums.length" class="grid-cards grid-cards--lg">
          <album-cover
            v-for="item in artistHotAlbums"
            :key="item.id"
            :data="item"
          ></album-cover>
        </div>
        <ea-empty v-else compact title="暂无专辑" />
      </section>

      <!-- MV -->
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">MV</h2>
        </div>
        <div v-if="artistHotMvs.length" class="grid-cards grid-cards--lg">
          <mv-cover
            v-for="item in artistHotMvs"
            :key="item.id"
            :data="item"
          ></mv-cover>
        </div>
        <ea-empty v-else compact title="暂无 MV" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { BrowserSafari, Like, PlayOne } from '@icon-park/vue-next'
import { useLocalStorage } from '@vueuse/core'
import {
  getArtistAlbumApi,
  getArtistDetailApi,
  getArtistMvApi,
  getSongsByArtistIdApi,
  playAllByArtistId as playAllSongsByArtistId,
  subArtistApi,
} from '@/api/artist'
import { getMusicDetailApi } from '@/api/music'
import type { ArtistBaseInfo, ArtistInfo } from '@/types/artistRel'
import type { AlbumBaseInfo } from '@/types/albumRel'
import type { MvBaseInfo } from '@/types/mvRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import { handleRequestError, openUrl, routeTo } from '@/utils/common'
import notify from '@/components/common/notification/notify'
import { mapAlbum, mapSong, normalizeImageUrl } from '@/views/shared/mappers'

defineOptions({
  name: 'artist',
})

const route = useRoute()

const artistId = computed(() => String(route.params.id ?? ''))
const loaded = ref(false)
const loadFailed = ref(false)
const artistInfo = ref<ArtistInfo>()
const artistHotSongs = ref<MusicBaseInfo[]>([])
const artistHotAlbums = ref<AlbumBaseInfo[]>([])
const artistHotMvs = ref<MvBaseInfo[]>([])
const artistSubList = useLocalStorage<ArtistBaseInfo[]>('artistSubList', [])

const isStarArtist = computed(() =>
  artistSubList.value.some((item) => String(item.id) === artistId.value)
)

const artistStats = computed(() => {
  const artist = artistInfo.value?.artist
  return `${artist?.musicSize ?? 0} 首歌 · ${artist?.albumSize ?? 0} 张专辑 · ${
    artist?.mvSize ?? 0
  } 首 MV`
})

const descriptionText = computed(() => {
  const description = artistInfo.value?.artist?.briefDesc
  return typeof description === 'string' ? description.trim() : ''
})

// ---------------- 简介折叠 ----------------
const descRef = ref<HTMLElement | null>(null)
const descExpanded = ref(false)
const descOverflow = ref(false)

const measureDesc = () => {
  const element = descRef.value
  if (!element || descExpanded.value) return
  descOverflow.value = element.scrollHeight - element.clientHeight > 1
}

const handleResize = () => {
  measureDesc()
}

const getArtistDetail = async () => {
  const { data } = await getArtistDetailApi({ id: artistId.value })
  artistInfo.value = data
}

const getHotSongsByArtistId = async () => {
  const { songs } = await getSongsByArtistIdApi({
    id: artistId.value,
    limit: 5,
  })
  const ids = (songs ?? []).map((song) => song.id)
  if (!ids.length) {
    artistHotSongs.value = []
    return
  }
  const { songs: detailSongs } = await getMusicDetailApi({
    ids: ids.join(','),
  })
  artistHotSongs.value = (detailSongs ?? []).map(mapSong)
}

const getAlbumsByArtistId = async () => {
  const { hotAlbums } = await getArtistAlbumApi({
    id: artistId.value,
    limit: 10,
  })
  artistHotAlbums.value = (hotAlbums ?? []).map(mapAlbum)
}

const getMvsByArtistId = async () => {
  const { mvs } = await getArtistMvApi({ id: artistId.value, limit: 8 })
  artistHotMvs.value = (mvs ?? []).map((mv) => ({
    ...mv,
    picUrl: normalizeImageUrl(mv.picUrl),
  }))
}

/** 歌手详情 / 热门歌曲 / 专辑 / MV 四路并行 */
const loadAll = async () => {
  loaded.value = false
  loadFailed.value = false
  descExpanded.value = false
  descOverflow.value = false
  try {
    await Promise.allSettled([
      getArtistDetail(),
      getHotSongsByArtistId(),
      getAlbumsByArtistId(),
      getMvsByArtistId(),
    ])
    loaded.value = true
    loadFailed.value = !artistInfo.value
    await nextTick()
    measureDesc()
  } catch (error) {
    console.error('[HaloMusic] load artist failed:', error)
    loadFailed.value = true
  }
}

const handlePlayAll = () => {
  playAllSongsByArtistId(Number(artistId.value)).catch((error: unknown) => {
    console.error('[HaloMusic] play artist songs failed:', error)
    handleRequestError(error, '播放失败，请稍后重试')
  })
}

const handleOpenInBrowser = () => {
  openUrl(`https://music.163.com/#/artist?id=${artistId.value}`)
}

const starArtist = async () => {
  const target = isStarArtist.value ? 2 : 1
  try {
    const res = await subArtistApi(artistId.value, target)
    if (res.code !== 200) {
      notify({ message: '关注操作失败', type: 'warning' })
      return
    }
    if (target === 2) {
      artistSubList.value = artistSubList.value.filter(
        (item) => String(item.id) !== artistId.value
      )
    } else {
      artistSubList.value = [
        ...artistSubList.value,
        {
          id: Number(artistId.value),
          name: artistInfo.value?.artist?.name ?? '',
          picUrl: normalizeImageUrl(artistInfo.value?.artist?.cover),
        },
      ]
    }
    notify({
      message: target === 1 ? '关注成功' : '已取消关注',
      type: 'success',
    })
  } catch (error) {
    console.error('[HaloMusic] star artist failed:', error)
    handleRequestError(error, '关注操作失败，请稍后重试')
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  void loadAll()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
/* ---------------- 统一详情页头 ---------------- */
.page-loading {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 28px;
  width: 100%;
  min-width: 0;
}

.detail-cover {
  flex: none;
  width: 176px;
  height: 176px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background-color: var(--color-secondary-bg);
  box-shadow: var(--shadow-sm);
}

.detail-cover--round {
  border-radius: var(--radius-full);
}

.detail-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 260px;
}

.detail-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.detail-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-dot {
  margin: 0 6px;
  color: var(--color-text-subtle);
}

.detail-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  line-height: 1.65;
  white-space: pre-line;
}

.detail-desc--expanded {
  display: block;
  overflow: visible;
  -webkit-line-clamp: unset;
}

.detail-desc-toggle {
  padding: 0;
  border: 0;
  background-color: transparent;
  color: var(--color-primary);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.detail-desc-toggle:hover {
  text-decoration: underline;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

/* 分区右侧的「查看全部」/统计 */
.section-more {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.section-more:hover {
  color: var(--color-primary);
}
</style>
