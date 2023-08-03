<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-baseline gap-2">
      <div class="text-3xl font-bold">
        {{ searchKey }}
      </div>
      <div class="text-gray-400 font-thin text-base">的相关搜索如下</div>
    </div>
    <div>{{ artists }}</div>
    <div>{{ artistCount }}</div>
    <div>{{ mvs }}</div>
    <div>{{ mvCount }}</div>
    <div>{{ songs }}</div>
    <div>{{ songCount }}</div>
    <div>{{ userprofiles }}</div>
    <div>{{ userprofileCount }}</div>
    <div>{{ albums }}</div>
    <div>{{ albumCount }}</div>
    <div>{{ playlists }}</div>
    <div>{{ playlistCount }}</div>
  </div>
</template>

<script setup lang="ts">
import pinia from "@/store/store";
import { useSearchStore } from "@/store/index";
import { computed, onMounted } from "vue";

const searchStore = useSearchStore(pinia);

const searchKey = computed(() => {
  return searchStore.getSearchKey;
});

const searchResult = computed(()=>{
  return searchStore.getSearchResult
})

const artists = computed(() => {
  return searchStore.getSearchResult.artist.s;
});
const artistCount = computed(() => {
  return searchStore.getSearchResult.artist.count;
});

const songs = computed(() => {
  return searchStore.getSearchResult.song.s;
});
const songCount = computed(() => {
  return searchStore.getSearchResult.song.count;
});

const albums = computed(() => {
  return searchStore.getSearchResult.album.s;
});
const albumCount = computed(() => {
  return searchStore.getSearchResult.album.count;
});

const playlists = computed(() => {
  return searchStore.getSearchResult.playlist.s;
});
const playlistCount = computed(() => {
  return searchStore.getSearchResult.playlist.count;
});

const mvs = computed(() => {
  return searchStore.getSearchResult.mv.s;
});
const mvCount = computed(() => {
  return searchStore.getSearchResult.mv.count;
});

const userprofiles = computed(() => {
  return searchStore.getSearchResult.userprofile.s;
});
const userprofileCount = computed(() => {
  return searchStore.getSearchResult.userprofile.count;
});

onMounted(() => {
  console.log("触发搜索");
});
</script>

<style scoped></style>
