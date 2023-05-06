<template>
    <ea-modal id="logout-modal" msg="确认退出登陆吗" @confirm="doLogout"></ea-modal>
</template>

<script setup lang="ts">
import { doLogout } from '@/utils/common';


</script>

<style scoped>

</style>