<template>
  <!-- 加载骨架：头部信息区（封面 + 标题/作者/统计行）+ 与真实行高一致的 20 行 -->
  <div
    v-if="!loaded && !loadFailed"
    class="flex flex-col w-full px-4 gap-8"
    aria-busy="true">
    <div class="flex my-4 gap-4">
      <div class="w-64 flex-none">
        <ea-skeleton
          variant="rect"
          height="16rem"
          radius="12px" />
      </div>
      <div class="flex flex-col gap-4 flex-1 min-w-0 py-2">
        <ea-skeleton
          variant="rect"
          width="18rem"
          height="32px" />
        <ea-skeleton
          variant="text"
          width="12rem" />
        <ea-skeleton
          variant="text"
          width="16rem" />
        <ea-skeleton
          variant="text"
          width="60%" />
        <ea-skeleton
          variant="text"
          width="48%" />
        <div class="flex gap-4 mt-auto pb-2">
          <ea-skeleton
            variant="rect"
            width="7rem"
            height="40px"
            radius="9999px" />
          <ea-skeleton
            variant="rect"
            :width="40"
            :height="40"
            radius="9999px" />
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <ea-skeleton
        v-for="index in 20"
        :key="`skeleton-track-${index}`"
        variant="row" />
    </div>
  </div>
  <ea-empty
    v-else-if="loadFailed"
    title="歌单加载失败"
    description="可能是网络异常或歌单不存在"
    action-text="重新加载"
    @action="loadAll" />
  <div
    v-else
    class="flex flex-col w-full px-4 h-64 gap-8">
    <div class="flex my-4 gap-4">
      <lmg
        :src="playListDetail?.coverImgUrl"
        :width="300"
        :height="300"
        class="w-64 h-64 rounded-xl"></lmg>
      <div class="flex flex-col gap-4 truncate pl-4">
        <div class="flex items-center gap-4 font-bold text-2xl my-2">
          <div v-show="!isEdit">
            {{ playListDetail?.name }}
          </div>
          <input
            v-show="isEdit"
            ref="playlistNameInputRef"
            v-model="newName"
            type="text"
            placeholder="请输入歌单名"
            class="playlist-name-input"
            @blur="handleBlur"
            @keydown.enter="confirmEdit" />
          <icon-park
            v-if="isOwner"
            :icon="Edit"
            theme="filled"
            :size="24"
            class="cursor-pointer hover:bg-[var(--color-hover)] rounded-full p-1 transition-all duration-300"
            title="编辑歌单名"
            @click="handleEdit"></icon-park>
        </div>

        <div>
          <span>Created By </span>
          <span
            class="ea-link"
            @click="handleOpenCreator"
            >{{ playListDetail?.creator?.nickname }}</span
          >
        </div>
        <div class="text-[var(--color-text-muted)] text-sm">
          <span>最后更新于</span>
          <span>{{ updateTimeText }}</span>
          <span> · </span>
          <span>{{ `${playListDetail?.trackCount ?? 0}首` }}</span>
        </div>
        <div class="text-[var(--color-text-muted)] text-sm inline-block playlist-detail">
          {{ playListDetail?.description }}
        </div>
        <div class="flex flex-grow gap-4 items-end">
          <ea-button @click="handlePlayAll"
            ><icon-park
              :icon="PlayOne"
              theme="filled"
              :size="20"
              class="rounded-full p-1" />
            <div class="text-lg font-bold">播放</div></ea-button
          >
          <ea-button
            v-if="!isOwner"
            :title="playListDetail?.subscribed ? '取消收藏' : '收藏'"
            @click="handleSubscribePlayList">
            <icon-park
              :icon="Like"
              :theme="playListDetail?.subscribed ? 'filled' : 'outline'"
              :size="20"
              class="rounded-full p-1" />
          </ea-button>
          <ea-button
            v-else
            for="delete-modal"
            type="danger">
            <icon-park
              :icon="Delete"
              theme="outline"
              :size="20"
              class="rounded-full p-1" />
            <div class="text-lg font-bold">删除</div>
          </ea-button>
        </div>
      </div>
    </div>
    <music-table
      v-if="musicTableData.length"
      :data="musicTableData"></music-table>
    <ea-empty
      v-else
      title="歌单里还没有歌曲"
      description="去发现页看看别的歌单吧" />
  </div>
  <ea-modal
    id="delete-modal"
    @confirm="handleDeletePlayList">
    <div class="font-bold">确定删除此歌单吗？</div>
  </ea-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { Delete, Edit, Like, PlayOne } from '@icon-park/vue-next'
import {
  deletePlayListApi,
  getPlayListAllApi,
  getPlayListDetailApi,
  subscribePlayListApi,
  updatePlaylistName,
} from '@/api/playList'
import type { PlayListDetail } from '@/types/playListRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import { handleRequestError, openUrl } from '@/utils/common'
import { useUserInfoStore } from '@/store'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'playlist',
})

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore(pinia)
const userStore = useUserInfoStore(pinia)

const loaded = ref(false)
const loadFailed = ref(false)
const isEdit = ref(false)
const newName = ref('')
const playlistNameInputRef = ref<HTMLInputElement | null>(null)
const playListDetail = ref<PlayListDetail>()
const musicTableData = ref<MusicBaseInfo[]>([])

const playListId = computed(() => String(route.params.id ?? ''))
const currentUserId = computed(() => userStore.userInfo?.userId)
const isOwner = computed(
  () => playListDetail.value?.creator?.userId === currentUserId.value
)

const updateTimeText = computed(() => {
  const time = playListDetail.value?.trackUpdateTime
  if (typeof time !== 'number' || !time) return ''
  return dayjs(time).format('YYYY-MM-DD')
})

const loadDetail = async () => {
  const { playlist } = await getPlayListDetailApi({ id: playListId.value })
  playListDetail.value = playlist
}

const loadSongs = async () => {
  const { songs } = await getPlayListAllApi({ id: playListId.value })
  musicTableData.value = (songs ?? []).map(mapSong)
}

/** 详情与歌曲并行请求，任一失败都进入错误态（可重试） */
const loadAll = async () => {
  loaded.value = false
  loadFailed.value = false
  try {
    await Promise.all([loadDetail(), loadSongs()])
    loaded.value = true
  } catch (error) {
    console.error('[HaloMusic] load playlist failed:', error)
    loadFailed.value = true
    handleRequestError(error, '歌单加载失败，请稍后重试')
  }
}

const handleOpenCreator = () => {
  const creatorId = playListDetail.value?.creator?.userId
  if (!creatorId) return
  openUrl(`https://music.163.com/#/user/home?id=${creatorId}`)
}

const handlePlayAll = () => {
  const ids = musicTableData.value.map(music => music.id)
  if (!ids.length) {
    notify({ message: '歌单里还没有歌曲', type: 'warning' })
    return
  }
  playerStore.playMulti(ids.join(','))
}

const handleEdit = async () => {
  isEdit.value = true
  newName.value = playListDetail.value?.name ?? ''
  await nextTick()
  playlistNameInputRef.value?.focus()
}

const handleBlur = () => {
  isEdit.value = false
}

const confirmEdit = async () => {
  const name = newName.value.trim()
  if (!name) {
    isEdit.value = false
    return
  }
  try {
    await updatePlaylistName({ id: playListId.value, name })
    if (playListDetail.value) playListDetail.value.name = name
    notify({ message: '修改成功', type: 'success' })
  } catch (error) {
    console.error('[HaloMusic] rename playlist failed:', error)
    handleRequestError(error, '修改失败')
  } finally {
    isEdit.value = false
  }
}

const handleDeletePlayList = async () => {
  try {
    await deletePlayListApi({ id: playListId.value })
    notify({ message: '歌单已删除', type: 'success' })
    router.push('/me')
  } catch (error) {
    console.error('[HaloMusic] delete playlist failed:', error)
    handleRequestError(error, '删除失败，请稍后重试')
  }
}

const handleSubscribePlayList = async () => {
  try {
    await subscribePlayListApi({
      id: playListId.value,
      t: playListDetail.value?.subscribed ? 2 : 1,
    })
    await loadDetail()
  } catch (error) {
    console.error('[HaloMusic] subscribe playlist failed:', error)
    handleRequestError(error, '操作失败，请稍后重试')
  }
}

onMounted(loadAll)
</script>

<style scoped>
.playlist-name-input {
  min-width: 240px;
  padding: 4px 8px;
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
  font-size: 20px;
  font-weight: 700;
  outline: none;
}

.playlist-name-input:focus {
  border-color: var(--color-primary);
}

.playlist-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
