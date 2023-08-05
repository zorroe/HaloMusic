<template>
  <div class="flex flex-col gap-4">
    <!-- <div class="flex items-baseline gap-2">
      <div class="text-2xl font-bold">
        {{ searchKey }}
      </div>
      <div class="text-gray-400 font-thin text-base">的相关搜索如下</div>
    </div>-->
    <div>
      <div class="text-2xl my-2">
        <span class="font-bold">{{ searchKey }}</span>
        <span>相关歌手</span>
      </div>
      <div class="grid-cols-5 grid place-items-center gap-8 mt-4">
        <artist-cover
          v-for="item in artists.slice(0, 5)"
          :key="item.id"
          :data="item"></artist-cover>
      </div>
    </div>
    <div>
      <div class="text-2xl my-2">
        <span class="font-bold">{{ searchKey }}</span>
        <span>相关歌单</span>
      </div>
      <div class="grid-cols-5 grid place-items-center gap-8 mt-4">
        <play-list-cover
          v-for="item in playlists"
          :key="item.id"
          :data="item"></play-list-cover>
      </div>
      <div
        class="flex justify-center items-center"
        v-show="playlists.length < playlistCount">
        <ea-button @click="loadMore('playlist', playlists.length)" type="info">
          <div class="text-lg font-bold">加载更多歌单</div>
        </ea-button>
      </div>
    </div>
    <div>
      <div class="text-2xl my-2">
        <span class="font-bold">{{ searchKey }}</span>
        <span>相关歌曲</span>
      </div>
      <music-table :data="songs" :showCover="false"></music-table>
      <div
        class="flex justify-center items-center"
        v-show="songs.length < songCount">
        <ea-button @click="loadMore('song', songs.length)" type="info">
          <div class="text-lg font-bold">加载更多歌曲</div>
        </ea-button>
      </div>
    </div>
    <div>
      <div class="text-2xl my-2">
        <span class="font-bold">{{ searchKey }}</span>
        <span>相关MV</span>
      </div>
      <div class="grid-cols-4 grid place-items-center gap-4">
        <mv-cover v-for="item in mvs.slice(0, 8)" :data="item"></mv-cover>
      </div>
    </div>
    <div>
      <div class="text-2xl my-2">
        <span class="font-bold">{{ searchKey }}</span>
        <span>相关用户</span>
      </div>
      <div class="grid-cols-5 grid place-items-center gap-4">
        <user-cover
          v-for="item in userprofiles.slice(0, 5)"
          :data="item"></user-cover>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import pinia from "@/store/store";
import { useSearchStore } from "@/store/index";
import { searchByType } from "@/api/search";
import { computed, onMounted } from "vue";
import dayjs from "dayjs";

const searchStore = useSearchStore(pinia);

const searchKey = computed(() => {
  return searchStore.getSearchKey;
});

const artists = computed(() => {
  return searchStore.getSearchResult.artist.s;
});

const artistCount = computed(() => {
  return searchStore.getSearchResult.artist.count;
});

const songs = computed(() => {
  const s = searchStore.getSearchResult.song.s;
  return s.map((item: any) => {
    return {
      id: item.id,
      name: item.name,
      picUrl: item.al.picUrl,
      singers: item.ar.map((r: any) => {
        return {
          id: r.id,
          name: r.name,
        };
      }),
      duration: dayjs(item.dt).format("mm:ss"),
      album: {
        id: item.al.id,
        name: item.al.name,
      },
    };
  });
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
  const s = searchStore.getSearchResult.playlist.s;
  return s.map((item: any) => {
    return {
      id: item.id,
      name: item.name,
      picUrl: item.coverImgUrl,
      playCount: item.playCount,
      creator: {
        id: item.creator.userId,
        nickname: item.creator.nickname,
      },
    };
  });

  // return searchStore.getSearchResult.playlist.s;
});

const playlistCount = computed(() => {
  return searchStore.getSearchResult.playlist.count;
});

const mvs = computed(() => {
  const s = searchStore.getSearchResult.mv.s;
  return s.map((item: any) => {
    return {
      id: item.id,
      name: item.name,
      picUrl: item.cover,
      creators: item.artists.map((a: any) => {
        return {
          id: a.id,
          name: a.name,
        };
      }),
    };
  });
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

const loadMore = (type: string, offset: number) => {
  searchByType(type, offset);
};

onMounted(() => {
  console.log("触发搜索");
});
</script>

<style scoped></style>
