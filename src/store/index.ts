import type { UserProfile } from "@/types/userRel";
import type { MusicBaseInfo } from "@/types/musicRel";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getAudioSourceFromNetease, getMusicDetail } from "@/api/music";
import notify from "@/components/common/notification/notify";
import { checkMusic } from "@/utils/common";
import { useLocalStorage } from "@vueuse/core";

export const useUserInfoStore = defineStore("userInfo", () => {
  const userInfo = ref<UserProfile>();

  const setUserInfo = (info: UserProfile) => {
    userInfo.value = info;
  };

  const getUserInfo = computed(() => {
    return userInfo.value;
  });

  return {
    userInfo,
    getUserInfo,
    setUserInfo,
  };
});

export const usePlayerStore = defineStore("player", () => {
  const audio = new Audio();
  const loopType = ref(useLocalStorage("player-loopType", 1)); //循环模式 0 单曲循环 1 列表循环 2随机播放
  const volume = ref(useLocalStorage("player-volume", 60)); //音量
  const playList = ref(useLocalStorage("player-playList", [] as number[])); //播放列表
  const id = ref(useLocalStorage("player-id", 0));
  const song = ref(useLocalStorage("player-song", {} as MusicBaseInfo));
  const isPlaying = ref(false);
  const isPause = ref(false);
  const sliderInput = ref(false);
  const ended = ref(false);
  const muted = ref(false);
  const currentTime = ref(0);
  const duration = ref(30);
  const showPlayerPage = ref(false);

  const playListCount = computed(() => {
    return playList.value.length;
  });

  const thisIndex = computed(() => {
    // 当前播放歌曲在播放列表中的索引
    return playList.value.findIndex((item) => item === id.value);
  });

  const nextSongId = computed(() => {
    return loopType.value === 0
      ? id.value
      : loopType.value === 1
      ? playList.value[(thisIndex.value + 1) % playList.value.length]
      : playList.value[Math.floor(Math.random() * playList.value.length)];
  });

  const prevSongId = computed(() => {
    return loopType.value === 0
      ? id.value
      : loopType.value === 1
      ? playList.value[
          (thisIndex.value - 1 + playList.value.length) % playList.value.length
        ]
      : playList.value[Math.floor(Math.random() * playList.value.length)];
  });

  const init = () => {
    audio.volume = volume.value / 100;
  };

  const pushPlayList = (ids: number | number[]) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    idList.forEach((id) => {
      if (!playList.value.includes(id)) {
        playList.value.push(id);
      }
    });
  };

  const clearPlayList = () => {
    id.value = 0;
    song.value = {} as MusicBaseInfo;
    isPlaying.value = false;
    isPause.value = false;
    sliderInput.value = false;
    ended.value = false;
    muted.value = false;
    currentTime.value = 0;
    playList.value = [];
    audio.load();
    setTimeout(() => {
      duration.value = 0;
    }, 100);
  };

  const play = async (songId: number) => {
    const { success, message } = await checkMusic(songId);
    if (!success) {
      notify({ message, type: "warning" });
      const index = playList.value.findIndex((songId) => songId === songId);
      fremoveSongFromPlaylist(songId);
      if (playList.value.length === 0 || isPlaying.value) return;
      const nextId = playList.value[index % playList.value.length];
      if (!isPlaying.value) play(nextId);
      return;
    }
    pushPlayList(songId);
    const [url, songInfo] = await Promise.all([
      getAudioSourceFromNetease(songId),
      getMusicDetail(songId),
    ]);
    id.value = songId;
    isPlaying.value = false;
    await playAudio(url);
    isPlaying.value = true;
    isPause.value = false;
    song.value = songInfo;
    interval();
  };

  const playMulti = async (ids: number[]) => {
    clearPlayList();
    pushPlayList(ids);
    await play(ids[0]);
  };

  const playAudio = async (url: string) => {
    audio.src = url;
    await audio.play();
  };

  const playEnd = () => {
    next();
  };

  const fremoveSongFromPlaylist = (songId: number) => {
    const index = playList.value.findIndex((id) => id == songId);
    if (index !== -1) {
      playList.value.splice(index, 1);
    }
  };

  const rePlay = () => {
    setTimeout(() => {
      currentTime.value = 0;
      audio.play();
    }, 1000);
  };

  const next = async () => {
    const { success, message } = await checkMusic(nextSongId.value);
    if (!success) {
      notify({ message, type: "warning" });
      id.value = nextSongId.value;
      next();
      fremoveSongFromPlaylist(nextSongId.value);
      return;
    }
    play(nextSongId.value);
  };

  const prev = async () => {
    const { success, message } = await checkMusic(prevSongId.value);
    if (!success) {
      notify({ message, type: "warning" });
      id.value = prevSongId.value;
      next();
      fremoveSongFromPlaylist(prevSongId.value);
      return;
    }
    play(prevSongId.value);
  };

  const togglePlay = () => {
    if (!audio.src) {
      init()
      play(id.value);
      return;
    }
    if (!song.value!.id) return;
    isPlaying.value = !isPlaying.value;
    if (!isPlaying.value) {
      audio.pause();
      isPause.value = true;
    } else {
      audio.play();
      isPause.value = false;
    }
  };

  const setPlay = () => {
    if (!song.value!.id) return;
    isPlaying.value = true;
    audio.play();
    isPause.value = false;
  };

  const setPause = () => {
    if (!song.value!.id) return;
    isPlaying.value = false;
    audio.pause();
    isPause.value = true;
  };

  const toggleLoop = () => {
    loopType.value = (loopType.value + 1) % 3;
  };

  const toggleMuted = () => {
    muted.value = !muted.value;
    audio.muted = muted.value;
  };

  const setVolume = (n: number) => {
    n = n > 100 ? 100 : n;
    n = n < 0 ? 0 : n;
    volume.value = n;
    audio.volume = n / 100;
  };

  const onSliderChange = (val: number) => {
    currentTime.value = val;
    sliderInput.value = false;
    audio.currentTime = val;
  };

  const onSliderInput = (val: number) => {
    sliderInput.value = true;
  };

  const interval = () => {
    if (isPlaying.value && !sliderInput.value) {
      setInterval(() => {
        currentTime.value = parseFloat(audio.currentTime.toFixed(2));
        duration.value = parseInt(audio.duration.toFixed(0));
        ended.value = audio.ended;
      }, 200);
    }
  };

  const openPlayerPage = () => {
    showPlayerPage.value = true;
  };

  const closePlayerPage = () => {
    showPlayerPage.value = false;
  };

  return {
    id,
    song,
    isPlaying,
    isPause,
    sliderInput,
    ended,
    muted,
    currentTime,
    duration,
    playList,
    loopType,
    volume,
    showPlayerPage,
    playListCount,
    nextSongId,
    prevSongId,
    init,
    play,
    playMulti,
    playAudio,
    playEnd,
    rePlay,
    next,
    prev,
    togglePlay,
    setPlay,
    setPause,
    toggleLoop,
    toggleMuted,
    setVolume,
    onSliderChange,
    onSliderInput,
    interval,
    openPlayerPage,
    closePlayerPage,
  };
});
