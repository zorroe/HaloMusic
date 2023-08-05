<template>
  <div class="flex justify-center pt-4">
    <video-player
      :src="src"
      :poster="cover"
      controls
      @play="handlePlay"
      :height="480"
      :width="900"
      :loop="true"
      :volume="0.6" />
  </div>
  <div class="flex justify-center mt-4">
    <div class="detail">
      <div class="text-xl font-semibold">
        {{ mvData?.name }}
      </div>
      <div class="flex items-center gap-2 mt-2">
        <div class="flex">
          <lmg
            v-for="artist in mvData?.artists"
            :src="artist.img1v1Url"
            :width="200"
            :height="200"
            @click="routeTo(`/artist/${artist.id}`)"
            class="w-12 h-12 rounded-full border-white border-2 cursor-pointer"></lmg>
        </div>
        <div class="flex items-center gap-2">
          <div
            v-for="artist in mvData?.artists"
            class="text-gray-600 text-sm font-light ea-link"
            @click="routeTo(`/artist/${artist?.id}`)">
            {{ artist.name }}
          </div>
        </div>
        <div class="flex flex-grow justify-end">
          <icon-park
            :icon="Share"
            :size="18"
            @click="openUrl(`https://music.163.com/#/mv?id=${mvData?.id}`)"
            class="cursor-pointer p-2 hover:bg-gray-200 transition-all duration-300 rounded-full"></icon-park>
        </div>
      </div>
      <div>{{}}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { mvDetailApi, mvUrlApi, MvData } from "./index";
import router from "@/router";
import { openUrl, routeTo } from "@/utils/common";
import { Share } from "@icon-park/vue-next";
import { usePlayerStore } from "@/store/index";
import pinia from "@/store/store";

const playerStore = usePlayerStore(pinia);

defineOptions({
  name: "mv",
});

interface BrType {
  size: number;
  br: number;
  point: number;
}

const mvId = ref<string>("");
const cover = ref<string>(""); // 封面
const brs = ref<BrType[]>([]); // 所有码率
const src = ref<string>(""); // mv地址
const r = ref<number>(1080); // 视频码率
const mvData = ref<MvData>();

const getMvDetail = async () => {
  const params = {
    mvid: mvId.value,
  };
  const { data } = await mvDetailApi(params);
  mvData.value = data;
  cover.value = data.cover;
  brs.value = data.brs;
};

const getMvUrl = async () => {
  const params = {
    id: mvId.value,
    r: r.value,
  };
  const { data } = await mvUrlApi(params);
  src.value = data.url;
};

const handlePlay = () => {
  playerStore.setPause();
};

onMounted(() => {
  mvId.value = router.currentRoute.value.params.id as string;
  getMvDetail();
  getMvUrl();
});
</script>

<style scoped>
.detail {
  width: 900px;
}
</style>
