<template>
    <div v-if="playList.length">
      <div class="text-lv1">正在播放</div>
    <div>
      <!-- 每日推荐歌曲列表的随机5首 -->
      <music-table :data="curMusic"></music-table>
    </div>
    <div class="text-lv1">即将播放</div>
    <div>
      <!-- 每日推荐歌曲列表的随机5首 -->
      <music-table :data="curPlayList"></music-table>
    </div>
    </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/store';
import pinia from '@/store/store';
import { computed } from 'vue';

const playerStore = usePlayerStore(pinia);
const playList = computed(()=>playerStore.songInfoList)
const song = computed(()=>playerStore.song)

const curPlayList = computed(()=>{
    const idx = playList.value.findIndex((item)=>item.id === song.value.id)
    const curPlayList = playList.value.slice(idx + 1).concat(playList.value.slice(0,idx))
    return curPlayList
});
const curMusic = computed(() => [playerStore.song]);


</script>

<style scoped>

</style>