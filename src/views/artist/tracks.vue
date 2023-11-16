<template>
  <div class="w-full inline-flex justify-center items-center">
    <div
      class="inline-flex items-center justify-center gap-3"
      v-if="totalPage > 1"
    >
      <div
        class="inline-flex h-8 w-8 items-center cursor-pointer transition-all duration-300 justify-center rounded border border-gray-100 bg-white text-gray-900 rtl:rotate-180"
        @click="prePage"
        :class="{
          'cursor-not-allowed': currentPage === 1,
          'hover:bg-gray-200': currentPage !== 1,
        }"
      >
        <span class="sr-only">Next Page</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          :class="{ 'text-gray-300': currentPage === 1 }"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <p class="text-xs text-gray-900">
        {{ currentPage }}
        <span class="mx-0.25">/</span>
        {{ totalPage }}
      </p>

      <div
        class="inline-flex h-8 w-8 items-center transition-all duration-300 cursor-pointer justify-center rounded border border-gray-100 bg-white text-gray-900 rtl:rotate-180"
        @click="nextPage"
        :class="{
          'cursor-not-allowed': currentPage === totalPage,
          'hover:bg-gray-200': currentPage !== totalPage,
        }"
      >
        <span class="sr-only">Next Page</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          :class="{ 'text-gray-300': currentPage === totalPage }"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeRouteUpdate, useRoute } from "vue-router";
import { ref, onMounted, computed } from "vue";
import { getArtistDetailApi, getSongsByArtistIdApi } from "@/api/artist";

const artistId = ref("");
const route = useRoute();

const updateId = () => {
  getArtistInfo();
  getAllTracks();
};

const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(50);

const totalPage = computed(() => {
  return Math.ceil(total.value / pageSize.value);
});

onBeforeRouteUpdate(async (to, from) => {
  //仅当 id 更改时才获取用户，例如仅 query 或 hash 值已更改
  if (to.params.id !== from.params.id) {
    artistId.value = to.params.id as string;
    updateId();
  }
});

// 1. 获取歌手信息
const getArtistInfo = async () => {
  const res = await getArtistDetailApi({ id: artistId.value });
  console.log(res);
};

// 2. 获取歌手所有歌曲
const getAllTracks = async () => {
  const params = {
    id: artistId.value,
    limit: pageSize.value,
    offset: (currentPage.value - 1) * pageSize.value,
  };
  const res = (await getSongsByArtistIdApi(params)) as any;
  total.value = res.total;
};

const prePage = () => {
  currentPage.value = currentPage.value - 1 > 0 ? currentPage.value - 1 : 1;
  getAllTracks();
};

const nextPage = () => {
  currentPage.value =
    currentPage.value + 1 < totalPage.value
      ? currentPage.value + 1
      : totalPage.value;
  getAllTracks();
};

onMounted(() => {
  artistId.value = route.params.id as string;
  updateId();
});
</script>

<style scoped></style>
