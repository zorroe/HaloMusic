<template>
  <div class="flex flex-col w-40 h-52">
    <div class="cover group cursor-pointer">
      <lmg
        :src="picUrl"
        :width="300"
        :height="300"
        class="w-40 h-40 rounded-full"
        @click="openUrl(
                `https://music.163.com/#/user/home?id=${data.userId}`
              )"
      ></lmg>
      </div>
    <div
      class="text-center cursor-pointer mt-2 text-base font-bold hover:decoration-black hover:underline truncate"
      @click="openUrl(
                `https://music.163.com/#/user/home?id=${data.userId}`
              )"
    >
      {{ props.data.nickname }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserProfile } from "@/types/userRel";
import { computed } from "vue";
import { openUrl } from "@/utils/common";

/* 歌手封面图组件 */
interface Props {
  data: UserProfile;
}

const props = defineProps<Props>();

const picUrl = computed(() => props.data.avatarUrl);
</script>

<style lang="scss" scoped></style>
