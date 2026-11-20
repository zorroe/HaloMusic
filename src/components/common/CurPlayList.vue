<template>
  <div
    v-if="currentMusic.length"
    class="cur-playlist">
    <section class="cur-playlist__section">
      <div class="cur-playlist__head">
        <h3 class="cur-playlist__title">正在播放</h3>
      </div>
      <music-table :data="currentMusic"></music-table>
    </section>
    <section
      v-if="showPlayList.length"
      class="cur-playlist__section">
      <div class="cur-playlist__head">
        <h3 class="cur-playlist__title">即将播放</h3>
        <span class="cur-playlist__count">{{ showPlayList.length }} 首</span>
      </div>
      <music-table :data="showPlayList"></music-table>
    </section>
  </div>
  <ea-empty
    v-else
    compact
    title="播放列表还是空的"
    description="去挑首歌吧" />
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

<style scoped>
.cur-playlist {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cur-playlist__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.cur-playlist__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.cur-playlist__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.cur-playlist__count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
