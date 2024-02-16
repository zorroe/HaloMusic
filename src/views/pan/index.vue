<template>
  <div class="px-4 flex flex-col">
    <div
      v-for="music in musicList"
      class="p-4 rounded flex hover:bg-gray-100 hover:bg-opacity-60 transition"
      @dblclick.native="playOne(music)">
      <div class="overflow-hidden text-ellipsis whitespace-nowrap">
        {{ music.songName }}
      </div>
      <div class="flex-1"></div>
      <div
        class="min-w-60 w-60 overflow-hidden text-ellipsis whitespace-nowrap text-base">
        {{ music.artist }}
      </div>
    </div>
    <ea-button
      @click="loadMore"
      class="mx-auto"
      v-show="musicList.length < totalCount"
      type="info">
      <div class="text-lg font-bold">加载更多</div>
    </ea-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { userCloudApi, userCloudDetailApi } from '@/api/music'

const totalCount = ref(0)

const params = ref({
  limit: 30,
  offset: 0,
})

const musicList = ref<any[]>([])

const userCloud = async () => {
  const { data, count } = (await userCloudApi(params.value)) as any
  totalCount.value = count
  musicList.value = [...musicList.value, ...data]
}

const loadMore = async () => {
  params.value = {
    limit: params.value.limit,
    offset: musicList.value.length,
  }
  await userCloud()
}

const playOne = async (music: any) => {
  const res = await userCloudDetailApi({ id: music.songId })
  console.log(res)
}

onMounted(() => {
  userCloud()
})
</script>

<style scoped></style>
