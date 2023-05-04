<template>
    <div class="flex flex-col w-48 h-64">
        <div class="cover group cursor-pointer">
            <lmg :src="picUrl" :width="300" :height="300" class="w-48 h-48 rounded-xl"></lmg>
            <icon-park :icon="PlayOne" fill="white" theme="filled" :size="24" class="cover-play group-hover:opacity-100"></icon-park>
        </div>
        <div class="text-left w-min max-w-full text-base font-bold hover:decoration-black hover:underline cursor-pointer truncate">{{ props.data.name }}</div>
        <div class="text-left w-min max-w-full text-xs text-gray-500 truncate flex gap-1 cursor-pointer">
            <span v-for="item in props.data.artists" class="hover:underline" v-text="item.name"></span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { AlbumBaseInfo } from '@/types/albumRel';
import { PlayOne } from '@icon-park/vue-next';
import { computed } from 'vue';

/* 专辑封面图组件 */
interface Props {
  data: AlbumBaseInfo;
}

const props = withDefaults(defineProps<Props>(), {
    data: () => ({} as AlbumBaseInfo) 
});

const picUrl = computed(() => props.data.picUrl);

</script>

<style lang="scss" scoped>

</style>