<template>
  <div class="text-6xl font-bold">发现</div>
  <div class="flex">
    
  </div>
</template>

<script setup lang="ts">
import {playListTagsApi} from "@/api/playList";
import { onMounted } from "vue";

defineOptions({
  name: "Explore",
});

const getPlayListTags = async () => {
  const res = await playListTagsApi();
  console.log(res);
};

onMounted(()=>{
  getPlayListTags()
})

</script>

<style lang="scss" scoped>

</style>
