<template>
  <div v-if="loaded" class="flex flex-col w-full px-4 h-64 gap-8">
    <div class="flex my-4 gap-4">
      <lmg
        :src="playListDetail.coverImgUrl"
        :width="300"
        :height="300"
        class="w-64 h-64 rounded-xl"
      ></lmg>
      <div class="flex flex-col gap-4 truncate pl-4">
        <div class="font-bold text-2xl my-2">{{ playListDetail.name }}</div>
        <div>
          <span>Created By </span>
          <span
            class="ea-link"
            @click="
              openUrl(
                `https://music.163.com/#/user/home?id=${playListDetail.userId}`
              )
            "
            >{{ playListDetail.creator.nickname }}</span
          >
        </div>
        <div class="text-gray-600 text-sm">
          <span>最后更新于</span>
          <span>{{
            dayjs(playListDetail.trackUpdateTime).format("YYYY-MM-DD")
          }}</span>
          <span> · </span>
          <span>{{ `${playListDetail.trackCount}首` }}</span>
        </div>
        <div class="text-gray-600 text-sm inline-block playlist-detail">
          {{ playListDetail.description }}
        </div>
        <div class="flex flex-grow gap-4 items-end">
          <ea-button @click="handlePlayAll"
            ><icon-park
              :icon="PlayOne"
              theme="filled"
              :size="20"
              class="rounded-full p-1"
            />
            <div class="text-lg font-bold">播放</div></ea-button
          >
          <ea-button
            v-if="playListDetail.userId != user.userId"
            @click="handleSubscribePlayList"
          >
            <icon-park
              :icon="Like"
              :theme="!playListDetail.subscribed ? 'outline' : 'filled'"
              :size="20"
              class="rounded-full p-1"
            />
          </ea-button>
          <ea-button for="delete-modal" type="danger" v-else>
            <icon-park
              :icon="Delete"
              theme="outline"
              :size="20"
              class="rounded-full p-1"
            />
            <div class="text-lg font-bold">删除</div>
          </ea-button>
        </div>
      </div>
    </div>
    <music-table :data="musicTableData"></music-table>
  </div>
  <ea-modal id="delete-modal" @confirm="handleDeletePlayList">
    <div class="font-bold">确定删除此歌单吗？</div>
  </ea-modal>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import router from "@/router";
import {
  deletePlayListApi,
  getPlayListAllApi,
  getPlayListDetailApi,
  subscribePlayListApi,
} from "@/api/playList";
import { onBeforeMount, onMounted, ref } from "vue";
import { Delete, Like, PlayOne } from "@icon-park/vue-next";
import { openUrl } from "@/utils/common";
import { MusicBaseInfo } from "@/types/musicRel";
import { usePlayerStore } from "@/store";
import pinia from "@/store/store";

const playerStore = usePlayerStore(pinia);

defineOptions({
  name: "playlist",
});

const loaded = ref(false);
const user = ref();
const musicTableData = ref<MusicBaseInfo[]>([]);

const init = () => {
  user.value = JSON.parse(localStorage.getItem("user") || "");
};
const playListId = ref<string>();
const playListDetail = ref();

const getPlayListDetail = async (params: any) => {
  const res: any = await getPlayListDetailApi(params);
  playListDetail.value = res.playlist;
};

const handleDeletePlayList = async () => {
  await deletePlayListApi({ id: playListId.value });
  router.push("/me");
};

const handleSubscribePlayList = async () => {
  // 判断是否已经订阅
  // 取消订阅
  await subscribePlayListApi({
    id: playListId.value,
    t: playListDetail.value.subscribed ? 2 : 1,
  });
  await getPlayListDetail({
    id: playListId.value,
  });
};

const getPlayListMusic = async () => {
  const { songs } = await getPlayListAllApi({ id: playListId.value });
  songs.forEach((song: any) => {
    musicTableData.value.push({
      id: song.id,
      name: song.name,
      picUrl: song.al.picUrl,
      singers: song.ar.map((ar: any) => {
        return { id: ar.id, name: ar.name };
      }),
      duration: dayjs(song.dt).format("mm:ss"),
      album: { id: song.al.id, name: song.al.name },
    });
  });
};

const handlePlayAll = () => {
  const ids = musicTableData.value.map((music) => music.id);
  playerStore.playMulti(ids);
};

onBeforeMount(() => {
  init();
});

onMounted(async () => {
  playListId.value = router.currentRoute.value.params.id as string;
  await getPlayListDetail({
    id: playListId.value,
  });
  await getPlayListMusic();
  loaded.value = true;
});
</script>

<style lang="scss" scoped>
.playlist-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
