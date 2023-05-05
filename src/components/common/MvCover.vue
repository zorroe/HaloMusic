<template>
    <div>
        {{ props.data }}
    </div>
</template>

<script setup lang="ts">
import { MvBaseInfo } from '@/types/mvRel';

/* mv封面图组件 */
interface Props {
  data: MvBaseInfo;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({} as MvBaseInfo),
});
</script>

<style scoped>

</style>