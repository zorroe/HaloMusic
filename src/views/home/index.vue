<template>
  <div v-show="isLoaded" class="flex flex-col">
    <div class="text-lv1">推荐歌单</div>
    <div class="grid-cols-5 grid place-items-center gap-4">
      <play-list-cover
        v-for="item in recommendPlayList"
        :data="item"
      ></play-list-cover>
    </div>
    <div class="text-lv1 flex items-center pr-4">
      <div>每日推荐</div>
      <div class="flex flex-grow  items-center justify-end gap-4">
        <icon-park :icon="PlayOne" :size="16" class="rounded-full border-black border-2 btn-animation"></icon-park>
        <div class="ea-link text-xs font-bold" @click="routeTo('/recommendMusic')">查看全部</div>
      </div>
    </div>
    <div>
      <!-- 每日推荐歌曲列表的随机5首 -->
      <music-table :data="recommendSongList.slice(0, 5)"></music-table>
    </div>
    <div class="text-lv1">推荐歌手</div>
    <div class="grid-cols-6 grid place-items-center gap-3">
      <artist-cover v-for="item in recommendArtist" :data="item"></artist-cover>
    </div>
    <div class="text-lv1">新专速递</div>
    <div class="grid-cols-5 grid place-items-center gap-4">
      <album-cover v-for="item in albumNewest" :data="item"></album-cover>
    </div>
    <div class="text-lv1">排行榜</div>
    <div class="grid-cols-5 grid place-items-center gap-4">
      <top-list-cover
        v-for="item in topList"
        :data="item"
        @click="routeTo(`/playlist/${item.id}`)"
      ></top-list-cover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getNewAlbumApi } from "@/api/album";
import { getrecommendArtistApi } from "@/api/artist";
import { getrecommendPlayListApi, getTopListApi } from "@/api/playList";
import { AlbumBaseInfo } from "@/types/albumRel";
import { ArtistBaseInfo } from "@/types/artistRel";
import { PlayListBaseInfo } from "@/types/playListRel";
import { onMounted, ref } from "vue";
import { routeTo, saveLikeMusicIds } from "@/utils/common";
import { getRecommendSongsApi} from "@/api/music";
import { MusicBaseInfo } from "@/types/musicRel";
import dayjs from "dayjs";
import { PlayOne } from "@icon-park/vue-next";

const isLoaded = ref(false);
const recommendPlayList = ref<PlayListBaseInfo[]>([]);
const recommendArtist = ref<ArtistBaseInfo[]>([]);
const albumNewest = ref<AlbumBaseInfo[]>([]);
const topList = ref<PlayListBaseInfo[]>([]);
const recommendSongList = ref<MusicBaseInfo[]>([]);

const getRecommendPlayList = async () => {
  const { result } = await getrecommendPlayListApi();
  result.forEach((item: any) => {
    recommendPlayList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
      playCount: item.playCount,
    });
  });
};

const getrecommendArtist = async () => {
  const { list } = await getrecommendArtistApi();
  // 随机6个
  list.artists.sort(() => Math.random() - 0.5);
  list.artists.splice(0, 6).forEach((item: any) => {
    recommendArtist.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
    });
  });
};

const getAlbumNewest = async () => {
  const { albums } = await getNewAlbumApi();
  albums.sort(() => Math.random() - 0.5);
  albums.splice(0, 10).forEach((item: any) => {
    albumNewest.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
      artists: item.artists.map((item: any) => {
        return {
          id: item.id,
          name: item.name,
          picUrl: "",
        };
      }),
    });
  });
};

const getTopList = async () => {
  const { list } = await getTopListApi();
  list.splice(0, 5).forEach((item: any) => {
    topList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.coverImgUrl,
      playCount: item.playCount,
    });
  });
};

const getRecommendSongs = async () => {
  const { data } = await getRecommendSongsApi();
  data.dailySongs.forEach((item: any) => {
    recommendSongList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.al.picUrl,
      singers: item.ar.map((item: any) => {
        return {
          id: item.id,
          name: item.name,
          picUrl: "",
        };
      }),
      duration: dayjs(item.dt).format("mm:ss"),
      album: {
        id: item.al.id,
        name: item.al.name,
      },
    });
  });
};

onMounted(async () => {
  await getRecommendPlayList();
  await getrecommendArtist();
  await getRecommendSongs();
  getTopList();
  getAlbumNewest();
  isLoaded.value = true;
  setTimeout(() => {
    saveLikeMusicIds();
  }, 0);
});
</script>

<style scoped></style>
