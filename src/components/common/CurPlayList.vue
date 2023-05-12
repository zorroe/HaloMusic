<template>
  <div v-if="curMusic">
    <div class="text-lv1">正在播放</div>
    <div>
      <music-table :data="curMusic"></music-table>
    </div>
    <div class="text-lv1">即将播放</div>
    <div>
      <music-table :data="showPlayList"></music-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getMusicDetailApi } from "@/api/music";
import { usePlayerStore } from "@/store";
import pinia from "@/store/store";
import { MusicBaseInfo } from "@/types/musicRel";
import dayjs from "dayjs";
import { computed, onMounted, ref } from "vue";

defineOptions({
  name: "curPlaylist",
})

const playerStore = usePlayerStore(pinia);
const song = computed(() => playerStore.song);
const ids = computed(() => playerStore.playList);

const curMusic = computed(() => [playerStore.song]);
const curPlayList = ref<MusicBaseInfo[]>([])



const getSongsInfo = async () => {
  const {songs} = await getMusicDetailApi(ids.value.join(","));
  curPlayList.value = songs.map((song:any)=>{return {
      id: song.id,
      name: song.name,
      picUrl: song.al.picUrl,
      singers: song.ar.map((item:any)=>{
        return{
          id: item.id,
          name: item.name
        }
      }),
      duration: dayjs(song.dt).format("mm:ss"),
      album: {
        id: song.al.id,
        name: song.al.name
      }
    }
  })
};

const showPlayList = computed(()=>{
  const ids = curPlayList.value.findIndex((item:any)=>item.id === song.value.id)
  return curPlayList.value.slice(ids + 1).concat(curPlayList.value.slice(0,ids))
})

onMounted(() => {
  getSongsInfo();
});
</script>

<style scoped></style>
