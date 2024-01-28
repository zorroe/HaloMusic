<template>
    <div @click="personalFm">
        FM
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import {personFmApi} from "@/api/music"

const personalFm = async()=>{
    const res = await personFmApi()
    console.log(res)
}

onMounted(()=>{
    personalFm()
})

</script>

<style scoped>

</style>