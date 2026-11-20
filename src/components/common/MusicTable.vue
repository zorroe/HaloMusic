<template>
  <!--
    长列表（>80 首）自动走窗口化渲染，短列表保持整表渲染；
    行渲染只有一份，通过 EaVirtualList 的默认插槽复用。
  -->
  <div class="music-table">
    <div
      v-if="props.data.length"
      class="music-table__head">
      <span class="music-col music-col--index">#</span>
      <span
        v-if="props.showCover"
        class="music-col music-col--cover"
        aria-hidden="true"></span>
      <span class="music-col music-col--main">歌曲</span>
      <span class="music-col music-col--album">专辑</span>
      <span
        class="music-col music-col--like"
        aria-hidden="true"></span>
      <span class="music-col music-col--duration">时长</span>
    </div>

    <ea-virtual-list
      :items="props.data"
      :item-height="ROW_HEIGHT"
      :threshold="VIRTUAL_THRESHOLD">
      <template #default="{ item, index }">
        <div
          class="music-row group"
          :class="{ playing: item.id == curMusicId }"
          @contextmenu.prevent="handleContextMenu($event, item)"
          @dblclick="handlePlay(item)">
          <span class="music-col music-col--index">
            <span
              v-if="item.id == curMusicId"
              class="music-bars"
              :class="{ 'is-paused': playerStore.paused }"
              aria-hidden="true">
              <i class="music-bar"></i>
              <i class="music-bar"></i>
              <i class="music-bar"></i>
            </span>
            <span
              v-else
              class="music-row__index"
              >{{ index + 1 }}</span
            >
          </span>
          <span
            v-if="props.showCover"
            class="music-col music-col--cover">
            <lmg
              :src="item.picUrl"
              :width="80"
              :height="80"
              class="music-row__cover" />
          </span>
          <div class="music-col music-col--main">
            <div
              class="music-row__name"
              :title="item.name">
              {{ item.name }}
            </div>
            <div class="music-row__artists">
              <span
                v-for="singer in item.singers"
                :key="singer.id"
                class="ea-link"
                @click.stop="routeTo(`/artist/${singer.id}`)"
                >{{ singer.name }}</span
              >
            </div>
          </div>
          <div class="music-col music-col--album">
            <span
              class="music-row__album-link"
              :title="item.album?.name"
              @click.stop="routeTo(`/album/${item.album?.id}`)"
              >{{ item.album?.name }}</span
            >
          </div>
          <span class="music-col music-col--like">
            <icon-park
              :icon="Like"
              :theme="liked(item.id) ? 'filled' : 'outline'"
              :size="16"
              class="music-row__like"
              :class="{
                'is-liked': liked(item.id),
                'heart-pop': isLikePopping(item.id),
              }"
              :title="liked(item.id) ? '取消喜欢' : '喜欢'"
              @click.stop="handleLikeMusic(item)"
              @animationend="handleLikePopEnd(item.id)" />
          </span>
          <span class="music-col music-col--duration">
            {{ displayDuration(item.duration) }}
          </span>
        </div>
      </template>
    </ea-virtual-list>
  </div>

  <ea-context-menu
    :items="contextMenuItems"
    :visible="contextMenu.visible"
    :x="contextMenu.x"
    :y="contextMenu.y"
    @select="handleContextMenuSelect"
    @close="closeContextMenu" />
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Cd, CopyLink, Like, PlayOne, User } from '@icon-park/vue-next'
import type { MusicBaseInfo } from '@/types/musicRel'
import { formatTrackTime, handleRequestError, routeTo } from '@/utils/common'
import { getMusicDetail } from '@/utils/player'
import { usePlayerStore } from '@/store/playerStore'
import { useLikeStore } from '@/store/index'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import EaContextMenu from './EaContextMenu.vue'
import type { EaContextMenuItem } from './EaContextMenu.vue'
import EaVirtualList from './EaVirtualList.vue'

defineOptions({
  name: 'musicTable',
})

interface Props {
  data?: MusicBaseInfo[]
  showCover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  showCover: true,
})

/** 行高（px）：必须与行的 CSS 高度一致，虚拟列表按此计算窗口 */
const ROW_HEIGHT = 52
/** 超过该行数才启用窗口化，短列表保持整表渲染 */
const VIRTUAL_THRESHOLD = 80

const playerStore = usePlayerStore(pinia)
const likeStore = useLikeStore(pinia)

const curMusicId = computed(() => playerStore.current.currentSong?.id)

const liked = (id: number) => likeStore.isLiked(id)

/**
 * duration 在历史数据里既可能是 "4:03" 字符串，也可能是原始毫秒数，
 * 这里统一收敛：数字按毫秒格式化，字符串原样展示。
 */
const displayDuration = (duration: MusicBaseInfo['duration'] | number) => {
  if (typeof duration === 'number') {
    return duration > 999
      ? formatTrackTime(Math.round(duration / 1000))
      : formatTrackTime(duration)
  }
  return duration ?? ''
}

const handlePlay = (music: MusicBaseInfo) => {
  playerStore.playOne(music.id + '')
}

/**
 * 喜欢成功切换后的心跳反馈：只加一次性 class，靠 animationend 移除，
 * 不用 setTimeout，避免组件提前卸载后残留定时器。
 */
const likePoppingIds = ref<number[]>([])

const isLikePopping = (id: number) => likePoppingIds.value.includes(id)

const triggerLikePop = (id: number) => {
  likePoppingIds.value = [...likePoppingIds.value, id]
}

const handleLikePopEnd = (id: number) => {
  likePoppingIds.value = likePoppingIds.value.filter((item) => item !== id)
}

const handleLikeMusic = async (music: MusicBaseInfo) => {
  try {
    await likeStore.toggleLike(music.id)
    // 成功切换后再播放心跳反馈，失败时不庆祝
    triggerLikePop(music.id)
  } catch (error) {
    console.error('[HaloMusic] toggle like failed:', error)
    notify({ message: '操作失败，请稍后重试', type: 'error' })
  }
}

/* --------------------------------------------------------------------------
 * 行右键菜单
 * ------------------------------------------------------------------------ */

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  music: MusicBaseInfo | null
}

const contextMenu = reactive<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  music: null,
})

/** 没有歌手/专辑数据时对应菜单项置灰，不隐藏（避免菜单高度忽大忽小） */
const contextMenuItems = computed<EaContextMenuItem[]>(() => {
  const music = contextMenu.music
  return [
    {
      key: 'play-next',
      label: '下一首播放',
      icon: PlayOne,
      disabled: !music,
    },
    {
      key: 'view-artist',
      label: '查看歌手',
      icon: User,
      disabled: !music?.singers.length,
    },
    {
      key: 'view-album',
      label: '查看专辑',
      icon: Cd,
      disabled: !music?.album?.id,
    },
    {
      key: 'copy-link',
      label: '复制歌曲链接',
      icon: CopyLink,
      disabled: !music,
    },
  ]
})

const handleContextMenu = (event: MouseEvent, music: MusicBaseInfo) => {
  contextMenu.music = music
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.visible = true
}

const closeContextMenu = () => {
  contextMenu.visible = false
}

const handleContextMenuSelect = (key: string) => {
  const music = contextMenu.music
  if (!music) return
  if (key === 'play-next') {
    void insertNextPlay(music)
  } else if (key === 'view-artist') {
    const singer = music.singers[0]
    if (singer) routeTo(`/artist/${singer.id}`)
  } else if (key === 'view-album') {
    if (music.album?.id) routeTo(`/album/${music.album.id}`)
  } else if (key === 'copy-link') {
    void copySongLink(music)
  }
}

/**
 * 「下一首播放」：优先走 store 的 insertNext（会持久化队列、重置随机池）；
 * 队列为空时没有「下一首」概念，插入后直接播放。
 */
const insertNextPlay = async (music: MusicBaseInfo) => {
  try {
    const songs = await getMusicDetail(music.id)
    const song = songs?.[0]
    if (!song) {
      notify({ message: '歌曲信息获取失败，无法加入播放队列', type: 'warning' })
      return
    }
    const queueWasEmpty = playerStore.current.idx < 0
    playerStore.insertNext(song)

    if (queueWasEmpty) {
      await playerStore.playByIndex(0)
      return
    }
    notify({ message: '已加入下一首播放', type: 'success' })
  } catch (error) {
    handleRequestError(error, '加入播放队列失败，请稍后重试')
  }
}

/** 优先用 Clipboard API；Electron 未授权或旧环境退回 execCommand */
const writeClipboardText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 权限被拒：继续尝试降级方案
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    textarea.setAttribute('readonly', '')
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  } catch (error) {
    console.error('[HaloMusic] copy song link failed:', error)
    return false
  }
}

const copySongLink = async (music: MusicBaseInfo) => {
  const link = `https://music.163.com/#/song?id=${music.id}`
  const copied = await writeClipboardText(link)
  notify(
    copied
      ? { message: '歌曲链接已复制', type: 'success' }
      : { message: '复制失败，请检查剪贴板权限', type: 'error' }
  )
}
</script>

<style scoped>
/* ===========================================================================
 * 歌曲表格：表头 + 紧凑行（52px）+ 当前播放高亮
 * 列宽类在表头与行之间共用，保证列对齐
 * ========================================================================= */
.music-table {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  container-type: inline-size;
}

.music-table__head {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;
  padding: 0 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.music-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.music-row:hover {
  background-color: var(--color-hover);
}

/* 当前播放行：主色底 + 主色文字（全局 .playing 已有同款语义，这里再显式兜底） */
.music-row.playing {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

/* 列宽 */
.music-col {
  min-width: 0;
}

.music-col--index {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: none;
  width: 28px;
  font-size: 0.75rem;
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
}

.music-col--cover {
  flex: none;
  width: 40px;
}

.music-col--main {
  flex: 1 1 auto;
  overflow: hidden;
}

.music-col--album {
  flex: 0 1 26%;
  overflow: hidden;
}

.music-col--like {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
}

.music-col--duration {
  flex: none;
  width: 52px;
  text-align: right;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

/* 行内容 */
.music-row__index {
  line-height: 1;
}

.music-row__cover {
  display: block;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.music-row__name {
  font-size: 0.875rem;
  font-weight: 600;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
}

.music-row__artists {
  display: flex;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.music-row__artists .ea-link {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
}

.music-row__artists .ea-link:hover {
  color: var(--color-primary);
}

.music-row__album-link {
  display: block;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.music-row__album-link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

/* 喜欢：未喜欢时默认低调且不可误点，hover 行才显现；已喜欢常亮 */
.music-row__like {
  color: var(--color-primary);
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  transition: opacity var(--motion-fast) var(--ease-standard);
}

.music-row:hover .music-row__like {
  opacity: 0.6;
  pointer-events: auto;
}

.music-row__like:hover,
.music-row__like.is-liked {
  opacity: 1;
}

.music-row__like.is-liked {
  pointer-events: auto;
}

/* 喜欢切换成功后的心跳反馈，animationend 后由脚本移除 class */
.heart-pop {
  animation: halo-heart-pop var(--motion-slow) var(--ease-spring) both;
}

/* 当前播放行的 3 根动感音条 */
.music-bars {
  display: inline-flex;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 2px;
  height: 12px;
}

.music-bar {
  width: 3px;
  height: 12px;
  border-radius: 1px;
  background-color: currentColor;
  transform-origin: bottom;
  animation: halo-bar-bounce 0.9s var(--ease-in-out) infinite;
}

.music-bar:nth-child(2) {
  animation-delay: 0.2s;
}

.music-bar:nth-child(3) {
  animation-delay: 0.4s;
}

/* 暂停时音条静止，恢复播放后从当前相位继续摆动 */
.music-bars.is-paused .music-bar {
  animation-play-state: paused;
}

/* 窄窗口 / 窄容器（播放队列抽屉）下隐藏专辑列，保证歌曲名与歌手不被压缩 */
@media (max-width: 900px) {
  .music-col--album {
    display: none;
  }
}

@container (max-width: 680px) {
  .music-col--album {
    display: none;
  }
}
</style>
