<template>
  <Teleport to="body">
    <Transition>
      <div
        v-show="showplayerPage"
        class="ea-player-page flex">
        <div
          class="flex flex-col w-1/2 h-full gap-4 justify-center items-center">
          <lmg
            :src="song.picUrl"
            :width="500"
            :height="500"
            class="w-80 h-80 rounded-2xl">
          </lmg>
          <div class="flex justify-center items-center gap-4">
            <icon-park
              :icon="LeftOne"
              :size="20"
              theme="filled"
              fill="black"
              class="footer-icon btn-animation"
              @click="playerStore.prev"></icon-park>
            <icon-park
              :icon="playIcon"
              :size="36"
              theme="filled"
              fill="black"
              class="footer-icon btn-animation"
              @click="playerStore.togglePlay"></icon-park>
            <icon-park
              :icon="RightOne"
              :size="20"
              theme="filled"
              fill="black"
              class="footer-icon btn-animation"
              @click="playerStore.next"></icon-park>
          </div>
          <div class="flex justify-center items-center gap-4 w-32">
            <icon-park
              :icon="volumnIcon"
              :size="18"
              theme="filled"
              fill="black"
              @click="handleClickVolumn"></icon-park>
            <div class="volume-bar">
              <vue-slider
                v-model="volume"
                :min="0"
                :max="100"
                :interval="1"
                :drag-on-click="true"
                :duration="0"
                tooltip="none"
                :dot-size="12">
              </vue-slider>
            </div>
          </div>
        </div>
        <div
          class="flex flex-col gap-3 w-5/12 pt-8 mb-8 overflow-y-auto lyric-list">
          <div
            v-for="(line, idx) in lyricList"
            class="py-1 text-base cursor-pointer"
            @dblclick="playerStore.onSliderChange(line.time)"
            :class="{
              'is-sing': isSing(idx),
            }">
            <span>{{ line.txt }}</span>
          </div>
        </div>
        <div class="flex w-1/12 justify-center">
          <icon-park
            class="mt-2 p-1 h-fit rounded btn-animation hover:bg-gray-100 hover:bg-opacity-80"
            :icon="Down"
            :size="20"
            @click="playerStore.closePlayerPage" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/store'
import pinia from '@/store/store'
import {
  Down,
  LeftOne,
  RightOne,
  Pause,
  PlayOne,
  VolumeNotice,
  VolumeSmall,
  VolumeMute,
} from '@icon-park/vue-next'
import { computed, ref, watch } from 'vue'
import { getLyricApi } from '@/api/music'

const playerStore = usePlayerStore(pinia)

const currentTime = computed(() => {
  return playerStore.currentTime
})
const volume = computed({
  get: () => playerStore.volume,
  set: val => {
    playerStore.setVolume(val)
  },
})

interface LyricLine {
  time: number
  txt: string
}

const isSing = (idx: number) => {
  return (
    currentTime.value > lyricList.value[idx].time &&
    currentTime.value < lyricList.value[idx + 1].time
  )
}

const playIcon = computed(() => {
  if (playerStore.isPlaying) {
    return Pause
  } else {
    return PlayOne
  }
})

const volumnIcon = computed(() => {
  if (volume.value == 0) {
    return VolumeMute
  } else if (volume.value <= 60) {
    return VolumeSmall
  } else {
    return VolumeNotice
  }
})

const lyricStr = ref('')
const lyricList = computed(() => {
  // 将歌词字符串转换为歌词数组
  const lyricArr = lyricStr.value.split('\n')
  const lyricList: LyricLine[] = []
  lyricArr.forEach(item => {
    const time = item.match(/\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?]/g)
    if (time) {
      const txt = item.split(time[0])[1]
      const timeReg = time[0].match(/(\d{2,}):(\d{2})(?:\.(\d{2,3}))?/)
      if (timeReg) {
        const time2Seconds =
          parseInt(timeReg[1]) * 60 +
          parseInt(timeReg[2]) +
          parseInt(timeReg[3]) / 1000

        lyricList.push({
          time: time2Seconds,
          txt,
        })
      }
    }
  })
  return lyricList
})

// const lyric = ref("");
const song = computed(() => {
  return playerStore.song
})

const showplayerPage = computed(() => {
  return playerStore.showPlayerPage
})

const handleClickVolumn = () => {
  if (playerStore.volume == 0) {
    playerStore.setVolume(60)
  } else {
    playerStore.setVolume(0)
  }
}

const scrollTo = () => {
  /* 让当前播放的歌词展示到中间
        让滚动平滑
    */
  const lyricListDom = document.querySelector('.lyric-list') as HTMLElement
  const currentLyricDom = document.querySelector('.is-sing') as HTMLElement
  if (!lyricListDom || !currentLyricDom) return
  const currentLyricDomTop = currentLyricDom.offsetTop
  const lyricListDomTop = lyricListDom.offsetTop
  const lyricListDomHeight = lyricListDom.offsetHeight
  const currentLyricDomHeight = currentLyricDom.offsetHeight
  const scrollTop =
    currentLyricDomTop -
    lyricListDomTop -
    lyricListDomHeight / 2 +
    currentLyricDomHeight / 2
  lyricListDom.scrollTo({
    top: scrollTop,
    behavior: 'smooth',
  })
}

setInterval(() => {
  scrollTo()
}, 1000)

watch(song, async () => {
  if (!song.value.id) return
  const { lrc } = await getLyricApi({ id: song.value.id })
  lyricStr.value = lrc.lyric
})
</script>

<style lang="scss" scoped>
.ea-player-page {
  position: fixed;
  top: 25px;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background: radial-gradient(transparent, rgb(255, 255, 255) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(5px);
}

.is-sing {
  color: rgb(51, 94, 234);
  font-weight: 800;
  font-size: 32px;
  line-height: 1.2;
}

.v-enter-active,
.v-leave-active {
  transition: all 300ms ease-in-out;
}

.v-enter-from,
.v-leave-to {
  //   opacity: 0;
  transform: translatey(100%);
}
</style>
