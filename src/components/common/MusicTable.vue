<template>
  <!--
    长列表（>80 首）自动走窗口化渲染，短列表保持整表渲染；
    行渲染只有一份，通过 EaVirtualList 的默认插槽复用。
  -->
  <ea-virtual-list
    :items="props.data"
    :item-height="ROW_HEIGHT"
    :threshold="VIRTUAL_THRESHOLD">
    <template #default="{ item }">
      <div
        class="music-row flex items-center rounded h-16 hover:bg-[var(--color-hover)] gap-4 group"
        :class="{ playing: item.id == curMusicId }"
        @contextmenu.prevent="handleContextMenu($event, item)"
        @dblclick="handlePlay(item)">
        <lmg
          v-if="props.showCover"
          :src="item.picUrl"
          :width="100"
          :height="100"
          class="w-12 h-12 rounded" />
        <div class="flex flex-col flex-grow justify-center px-2 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <span
              v-if="item.id == curMusicId"
              class="music-bars"
              :class="{ 'is-paused': playerStore.paused }"
              aria-hidden="true">
              <i class="music-bar"></i>
              <i class="music-bar"></i>
              <i class="music-bar"></i>
            </span>
            <div class="font-bold cursor-default truncate min-w-0">
              {{ item.name }}
            </div>
          </div>
          <div class="flex gap-1 text-sm">
            <span
              v-for="singer in item.singers"
              :key="singer.id"
              class="ea-link"
              @click.stop="routeTo(`/artist/${singer.id}`)"
              >{{ singer.name }}</span
            >
          </div>
        </div>
        <div class="w-1/3 text-base cursor-pointer truncate">
          <span
            class="hover:underline"
            @click.stop="routeTo(`/album/${item.album?.id}`)"
            >{{ item.album?.name }}</span
          >
        </div>
        <icon-park
          :icon="Like"
          :theme="liked(item.id) ? 'filled' : 'outline'"
          :size="16"
          class="subscribe-icon btn-animation"
          :class="{
            'no-liked': !liked(item.id),
            'heart-pop': isLikePopping(item.id),
          }"
          :title="liked(item.id) ? '取消喜欢' : '喜欢'"
          @click.stop="handleLikeMusic(item)"
          @animationend="handleLikePopEnd(item.id)" />
        <div class="flex w-12 text-base justify-end">
          {{ displayDuration(item.duration) }}
        </div>
      </div>
    </template>
  </ea-virtual-list>

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

/** 行高（px）：必须与行 DOM 的 h-16 一致，虚拟列表按此计算窗口 */
const ROW_HEIGHT = 64
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
 * 下一首播放：把这首歌插入当前播放队列的下一首，不打断正在播放的歌。
 * 播放器 store 暂未提供「插队」公开方法，这里用公开的 playlist / current / playByIndex 组合：
 * - 队列为空（无当前曲）时没有「下一首」的概念，直接播放；
 * - 已在队列中的歌先摘出来再插到当前曲之后，避免重复。
 */
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
.subscribe-icon {
  color: var(--color-primary);
  padding: 0.25rem;
  border-radius: 9999px;
}

/* 喜欢切换成功后的心跳反馈，animationend 后由脚本移除 class */
.heart-pop {
  animation: halo-heart-pop var(--motion-slow) var(--ease-spring) both;
}

.no-liked {
  visibility: hidden;
}

.group:hover .no-liked {
  visibility: visible;
}

/* 行 hover：只过渡背景色，不做位移，避免牵动布局 */
.music-row {
  transition: background-color var(--motion-fast) var(--ease-standard);
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
</style>
