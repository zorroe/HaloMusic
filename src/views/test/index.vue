<template>
  <div>
    <button @click="testCanPlay">testCanPlay</button>
    <br />
    <button @click="testMusicResource">testMusicResource</button>
    <br />
    <button @click="testGetMusicDetail1">testGetMusicDetail1</button>
    <br />
    <button @click="testGetMusicDetail2">testGetMusicDetail2</button>
    <br />
    <button @click="testGetPersonFm">testGetPersonFm</button>
    <br />
    <button @click="testPlayMulti">testPlayMulti</button>
    <br />
    <button @click="testPlayOne">testPlayOne</button>
    <br />
    <button @click="testPlayNext">testPlayNext</button>
    <br />
    <button @click="testPlayPrev">testPlayPrev</button>
    <br />
    <button @click="testPlayFm">testPlayFm</button>
  </div>
</template>

<script setup lang="ts">
import {
  canPlay,
  getSongResource,
  getMusicDetail,
  getPersonfm,
} from '@/utils/player'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'

const playerStore = usePlayerStore(pinia)

const testCanPlay = () => canPlay(1974443814)
const testMusicResource = () => getSongResource(1974443814, 'exhigh')
const testGetMusicDetail1 = () => getMusicDetail('1974443814')
const testGetMusicDetail2 = () => getMusicDetail('1974443814, 514761281')
const testGetPersonFm = () => getPersonfm()

const testPlayMulti = () => playerStore.playMulti('1974443814, 514761281')
const testPlayOne = () => playerStore.playOne('1974443814')
const testPlayNext = () => playerStore.playNext()
const testPlayPrev = () => playerStore.playPrev()

const testPlayFm = () => playerStore.playFm()
</script>

<style scoped></style>
