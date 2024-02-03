import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import notify from '@/components/common/notification/notify'
import {
  checkMusicApi,
  getAudioSourceFromNetease,
  getMusicDetailApi,
} from '@/api/music'
import {
  canPlay,
  getSongResource,
  getMusicDetail,
  getPersonfm,
} from '@/utils/player'
import { useLocalStorage, debounceFilter } from '@vueuse/core'

export const usePlayer2Store = defineStore('player2', () => {
  const audio = ref(new Audio())
  const songId = ref(useLocalStorage('player-id', ''))
  const cycleMode = ref(useLocalStorage('player-cycleMode', 1)) // 0 单曲循环  1 列表循环  2 随机
  const isFm = ref(false)
  const volume = ref(
    useLocalStorage('player-volume', 60, { eventFilter: debounceFilter(1000) })
  )
  const playlist = ref(useLocalStorage('player-playlist', [] as any[])) // 用来存放歌曲ids查询后的信息  /song/detail
  const showPlayerPage = ref(false)
  const timer = ref()
  const paused = ref(true)
  const currentTime = ref(0)

  const playlistCount = computed(() => playlist.value.length)
  const current = computed(() => {
    const idx = playlist.value.findIndex(song => {
      return Number(song.id) === Number(songId.value)
    })
    if (idx !== -1) {
      return { currentSong: playlist.value[idx], idx }
    } else {
      return { currentSong: null, idx }
    }
  })

  // 初始化播放器
  const initPlayer = () => {
    if (!audio.value) {
      audio.value = new Audio()
    }
    audio.value.volume = volume.value / 100

    // TODO 获取歌曲时长

    // 正在播放时触发的事件，用来更新进度条
    // audio.value.addEventListener('timeupdate', event => {
    //   currentTime.value = Number((event.timeStamp / 1000).toFixed(0))
    // })

    // 播放完触发的事件，用来下一首
    audio.value.addEventListener('ended', event => {
      playNext()
      currentTime.value = 0
    })

    // 播放时触发事件
    audio.value.addEventListener('play', event => {
      paused.value = false
    })

    audio.value.addEventListener('pause', event => {
      paused.value = true
    })
  }

  /**
   * 把歌曲信息放到播放列表里面
   * @param songInfo 歌曲信息
   */
  const pushSong2List = (songInfos: any[]) => {
    songInfos.forEach(songInfo => {
      const idx = playlist.value.findIndex(song => {
        return song.id === songInfo.id
      })
      if (idx === -1) {
        playlist.value.splice(current.value.idx + 1, 0, songInfo)
      }
    })
  }

  const popSongFromList = (id: string) => {
    const idx = playlist.value.findIndex(song => {
      return song.id === id
    })
    if (idx !== -1) {
      playlist.value.splice(idx, 1)
    }
  }

  /**
   * 播放歌曲
   * @param sourceUrl 歌曲资源url
   */
  const playSong = async (id: string, url: string) => {
    songId.value = id
    audio.value.src = url
    await audio.value.play()
    clearInterval(timer.value)
    timer.value = setInterval(() => {
      currentTime.value += 1
    }, 1000)
  }

  /**
   * 播放下一首
   */
  const playNext = async () => {
    currentTime.value = 0
    clearInterval(timer.value)
    let nextId
    if (isFm.value) {
      const { id } = await getPersonfm()
      nextId = id
    } else {
      if (cycleMode.value === 0) {
        nextId = current.value.currentSong.id
      } else if (cycleMode.value === 1) {
        const nextIdx = (current.value.idx + 1) % playlist.value.length
        nextId = playlist.value[nextIdx].id
      } else {
        const nextIdx = Math.floor(Math.random() * playlist.value.length)
        nextId = playlist.value[nextIdx].id
      }
    }
    playOne(nextId + '')
  }

  /**
   * 播放上一首
   */
  const playPrev = async () => {
    currentTime.value = 0
    clearInterval(timer.value)
    let prevId
    if (isFm.value) {
      const { id } = await getPersonfm()
      prevId = id
    } else {
      if (cycleMode.value === 0) {
        prevId = current.value.currentSong.id
      } else if (cycleMode.value === 1) {
        const prevIdx =
          (current.value.idx + playlist.value.length - 1) %
          playlist.value.length
        prevId = playlist.value[prevIdx].id
      } else {
        const prevIdx = Math.floor(Math.random() * playlist.value.length)
        prevId = playlist.value[prevIdx].id
      }
    }
    playOne(prevId + '')
  }

  /**
   * 暂停播放，继续播放
   */
  const tooglePlay = () => {
    if (audio.value.paused) {
      playOne(current.value.currentSong.id)
    } else {
      clearInterval(timer.value)
      audio.value.pause()
    }
  }

  const playMulti = async (ids: string) => {
    if (!ids) {
      notify({ message: '空的', type: 'warning' })
      return
    }
    const musicDetails = await getMusicDetail(ids)
    if (!musicDetails) {
      notify({ message: '空的', type: 'warning' })
      return
    }
    // 清空当前播放列表，把查询到的歌曲信息放到播放列表
    playlist.value = musicDetails
    // 播放第一首歌
    const songInfo = playlist.value[0]
    playOne(songInfo.id)
  }

  const playOne = async (id: string) => {
    clearInterval(timer.value)
    isFm.value = false
    if (!id) {
      notify({ message: '空的', type: 'warning' })
      return
    }
    const musicDetails = await getMusicDetail(id)
    if (!musicDetails) {
      notify({ message: '空的', type: 'warning' })
      return
    }
    pushSong2List(musicDetails)
    const songInfo = musicDetails[0]
    const can = await canPlay(songInfo.id)
    if (!can) {
      notify({ message: '暂无版权,尝试播放下一首', type: 'warning' })
      popSongFromList(songInfo.id)
      playNext()
      return
    }
    const source = await getSongResource(songInfo.id, 'exhigh')
    // 3. 查询到则开始播放
    if (!source) {
      notify({ message: '暂无资源,尝试播放下一首', type: 'warning' })
      popSongFromList(songInfo.id)
      playNext()
      return
    }
    console.log('source', source)
    playSong(songInfo.id, source.url)
  }

  const playFm = () => {
    isFm.value = true
    playNext()
  }

  const openPlayerPage = () => {
    showPlayerPage.value = true
  }

  const closePlayerPage = () => {
    showPlayerPage.value = false
  }

  const toggleLoop = () => {
    cycleMode.value = (cycleMode.value + 1) % 3
  }

  const setVolumn = (n: number) => {
    n = n > 100 ? 100 : n
    n = n < 0 ? 0 : n
    volume.value = n
    audio.value.volume = n / 100
  }

  const changeSlider = (val: number) => {
    currentTime.value = val
    audio.value.currentTime = val
  }

  const setPause = () => {
    audio.value.pause()
  }

  return {
    playlist,
    volume,
    current,
    songId,
    paused,
    cycleMode,
    currentTime,
    showPlayerPage,
    playlistCount,
    initPlayer,
    playMulti,
    tooglePlay,
    playNext,
    playPrev,
    playOne,
    playFm,
    openPlayerPage,
    closePlayerPage,
    toggleLoop,
    setVolumn,
    changeSlider,
    setPause,
  }
})
