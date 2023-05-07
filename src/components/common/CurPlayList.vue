<template>
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
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/store';
import pinia from '@/store/store';
import { computed } from 'vue';

const playerStore = usePlayerStore(pinia);
const curIndex = computed(()=>playerStore.thisIndex)
const playList = computed(()=>playerStore.playList)

const curPlayList = computed(()=>{
    const curPlayList = playList.value.slice(curIndex.value+1).concat(playList.value.slice(0,curIndex.value))
    return curPlayList
});
const curMusic = computed(() => [playerStore.song]);


</script>

<style scoped>

</style>