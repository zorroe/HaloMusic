<template>
  <div v-show="loaded" class="flex flex-col w-full px-4 h-64 gap-8">
    <div class="flex my-4 gap-8">
      <lmg
        :src="albumInfo?.picUrl"
        :width="300"
        :height="300"
        class="rounded-xl w-48 h-48 shadow"
      ></lmg>
      <div class="flex flex-col gap-2">
        <div class="font-bold text-3xl">{{ albumInfo?.name }}</div>
        <div>
          Singer by
          <span
            class="ea-link"
            @click="routeTo(`/artist/${albumInfo?.artist.id}`)"
            >{{ albumInfo?.artist.name }}</span
          >
        </div>
        <div class="text-sm">
          {{
            `${dayjs(albumInfo?.publishTime).format("YYYY")} · ${
              albumInfo?.size
            }首歌`
          }}
        </div>
        <div class="flex flex-grow gap-4 items-end">
          <ea-button>
            <icon-park
              :icon="PlayOne"
              theme="filled"
              :size="20"
              class="rounded-full p-1"
            />
            <div class="text-lg font-bold">播放</div>
          </ea-button>
          <ea-button>
            <icon-park
              :icon="Like"
              :theme="isSub ? 'filled':'outline'"
              :size="20"
              class="rounded-full p-1"
            />
          </ea-button>
        </div>
      </div>
    </div>
    <music-table :data="albumSongs" :showCover="false"></music-table>
  </div>
</template>

<script setup lang="ts">
import { getAlbumApi } from "@/api/album";
import router from "@/router";
import { AlbumInfo } from "@/types/albumRel";
import { MusicBaseInfo } from "@/types/musicRel";
import { computed, onMounted, ref } from "vue";
import { Like, PlayOne } from "@icon-park/vue-next";
import dayjs from "dayjs";
import { routeTo } from "@/utils/common";

defineOptions({
  name: "album",
});

const loaded = ref(false);
const albumId = ref<string>("");
const albumSongs = ref<MusicBaseInfo[]>([]);
const albumInfo = ref<AlbumInfo>();
const subAlbums = JSON.parse(localStorage.getItem("subAlbumIds") || "[]");

const isSub = computed(() => {
  return subAlbums.some((item: number) => item == albumInfo.value?.id);
});

const getAlbum = async () => {
  const { songs, album } = await getAlbumApi({ id: albumId.value });
  albumInfo.value = album;
  console.log(songs);
  
  songs.forEach((song: any) => {
    albumSongs.value?.push({
      id: song.id,
      name: song.name,
      picUrl: song.al.picUrl,
      singers: song.ar.map((singer: any) => {
        return {
          id: singer.id,
          name: singer.name,
        };
      }),
      duration: dayjs(song.dt).format("mm:ss"),
      album: {
        id: song.al.id,
        name: song.al.name,
      },
    });
  });
  console.log(albumSongs.value);
  
};

onMounted(async () => {
  albumId.value = router.currentRoute.value.params.id as string;
  await getAlbum();
  loaded.value = true;
});
</script>

<style scoped></style>
