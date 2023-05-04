<template>
  <img :src="src" :class="props.class" class="opacity-0" @load="handleLoaded" loading="lazy"/>
</template>



<script setup lang="ts">
import { computed } from 'vue';
// 
interface Props {
  src: string;
  width: number;
  height: number;
  class: string;
}

const props = withDefaults(defineProps<Props>(), {
    src: "",
    width: 200,
    height: 200,
    class: ""
});

const src = computed(() => props.src + `?param=${props.width}y${props.height}`);

const handleLoaded = (e: Event) => {
    const target = e.target as HTMLImageElement;
    // 添加一个类
    target.classList.add('gradual-appear');
}

</script>

<style lang="scss" scoped>
.gradual-appear{
    opacity: 1;
    transition: all 300ms linear;

    &:hover{
        box-shadow: 0px 10px 15px 0px rgba(86, 86, 86, 0.3);
    }

    &:active{
        transform: scale(0.95);
    }
}
</style>
