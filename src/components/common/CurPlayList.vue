<template>
  <div v-if="currentMusic.length">
    <div class="text-lv1">正在播放</div>
    <div>
      <music-table :data="currentMusic"></music-table>
    </div>
    <div class="text-lv1">即将播放</div>
    <div>
      <music-table :data="showPlayList"></music-table>
    </div>
  </div>
  <div
    v-else
    class="text-gray-500 text-center py-16">
    播放列表还是空的，去挑首歌吧
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MusicBaseInfo } from '@/types/musicRel'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'curPlaylist',
})

const playerStore = usePlayerStore(pinia)

const currentMusic = computed<MusicBaseInfo[]>(() => {
  const song = playerStore.current.currentSong
  return song ? [mapSong(song)] : []
})

const showPlayList = computed<MusicBaseInfo[]>(() => {
  const song = playerStore.current.currentSong
  const playlist = Array.isArray(playerStore.playlist)
    ? playerStore.playlist
    : []
  if (!song) return playlist.map(mapSong)
  const index = playlist.findIndex(item => item.id === song.id)
  if (index === -1) return playlist.map(mapSong)
  return playlist
    .slice(index + 1)
    .concat(playlist.slice(0, index))
    .map(mapSong)
})
</script>

<style scoped></style>
