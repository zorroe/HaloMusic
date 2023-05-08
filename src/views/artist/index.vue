<template>
  <div v-if="loaded" class="flex flex-col w-full px-4 h-64 gap-8">
    <div class="flex my-4 gap-4">
      <lmg
        :src="artistInfo.artist.cover"
        :width="300"
        :height="300"
        class="w-56 h-56 rounded-full"
      ></lmg>
      <div class="flex flex-col gap-4 truncate pl-6 w-full">
        <div class="font-bold text-3xl">{{ artistInfo.artist.name }}</div>
        <div class="text-base text-gray-800">{{ artistInfo.identify.imageDesc }}</div>
        <div class="text-sm text-gray-800">
          {{
            `${artistInfo.artist.musicSize}首歌 · ${artistInfo.artist.albumSize}张专辑 · ${artistInfo.artist.mvSize}首MV`
          }}
        </div>
        <div class="artist-desc">{{ artistInfo.artist.briefDesc }}</div>
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
              theme="filled"
              :size="20"
              class="rounded-full p-1"
            />
            <div class="text-lg font-bold">关注</div>
          </ea-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import router from "@/router";
import { ArtistInfo } from "@/types/artistRel";
import { getArtistDetailApi } from "@/api/artist";
import { Like, PlayOne } from "@icon-park/vue-next";

const artistId = ref<string>();

const artistInfo = ref<ArtistInfo>({} as ArtistInfo);
const loaded = ref(false);

const getArtistDetail = async () => {
  const { data } = await getArtistDetailApi({ id: artistId.value });
  artistInfo.value = data;
};

onMounted(async () => {
  artistId.value = router.currentRoute.value.params.id as string;
  await getArtistDetail();
  loaded.value = true;
  console.log(artistInfo.value.artist.briefDesc);
  
  
});
</script>

<style lang="scss" scoped>

.artist-desc{
    user-select: none;
    font-size: 14px;
    opacity: 0.68;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    cursor: pointer;
    white-space: normal;
    &:hover {
      transition: opacity 0.3s;
      opacity: 0.88;
    }
}
</style>
