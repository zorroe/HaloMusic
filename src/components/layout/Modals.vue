<template>
    <ea-modal id="logout-modal" @confirm="doLogout">
        <h3 class="font-bold text-lg">确定退出登陆吗？</h3>
    </ea-modal>
</template>

<script setup lang="ts">
import { doLogout } from '@/utils/common';


</script>

<style scoped>

</style>