import type { UserProfile } from "@/types/userRel";
import type { MusicBaseInfo } from "@/types/musicRel";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getAudioSourceFromNetease, getMusicDetail } from "@/api/music";
import notify from "@/components/common/notification/notify";
import { checkMusic } from "@/utils/common";

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

export const usePlayerStore = defineStore("player", {
  state: () => ({
    audio: new Audio(),
    loopType: 1, //循环模式 0 单曲循环 1 列表循环 2随机播放
    volume: 60, //音量
    playList: [] as number[], //播放列表,
    id: 0,
    song: {} as MusicBaseInfo,
    isPlaying: false, //是否播放中
    isPause: false, //是否暂停
    sliderInput: false, //是否正在拖动进度条
    ended: false, //是否播放结束
    muted: false, //是否静音
    currentTime: 0, //当前播放时间
    duration: 0, //总播放时长
    // 获取无法播放的歌曲的次数
    getErrorCount: 0,
  }),
  getters: {
    playListCount: (state) => {
      return state.playList.length;
    },
    thisIndex: (state) => {
      // 当前播放歌曲在播放列表中的索引
      return state.playList.findIndex((id) => id === state.id);
    },
    nextSongId(): number {
      const { loopType, thisIndex, playList } = this;
      return loopType === 0
        ? this.id
        : loopType === 1
        ? thisIndex === playList.length - 1
          ? playList[0]
          : playList[thisIndex + 1]
        : playList[Math.floor(Math.random() * playList.length)];
    },
    prevSongId(): number {
      const { thisIndex, playList, loopType } = this;
      return loopType === 0
        ? this.id
        : loopType === 1
        ? thisIndex === 0
          ? playList[playList.length - 1]
          : playList[thisIndex - 1]
        : playList[Math.floor(Math.random() * playList.length)];
    },
  },
  actions: {
    async init() {
      this.audio.volume = this.volume / 100;
    },
    //播放列表里面添加音乐
    pushPlayList(ids: number | number[]) {
      const idList = Array.isArray(ids) ? ids : [ids];
      idList.forEach((id) => {
        if (!this.playList.includes(id)) {
          this.playList.push(id);
        }
      });
    },

    clearPlayList() {
      this.id = 0;
      this.song = {} as MusicBaseInfo;
      this.isPlaying = false;
      this.isPause = false;
      this.sliderInput = false;
      this.ended = false;
      this.muted = false;
      this.currentTime = 0;
      this.playList = [] as number[];
      this.audio.load();
      setTimeout(() => {
        this.duration = 0;
      }, 100);
    },

    async play(id: number) {
      const { success, message } = await checkMusic(id);
      if (!success) {
        notify({ message: message, type: "warning" });
        this.fremoveSongFromPlaylist(id);
        return;
      }
      this.pushPlayList(id);
      const [url, song] = await Promise.all([
        getAudioSourceFromNetease(id),
        getMusicDetail(id),
      ]);
      this.id = id;
      this.isPlaying = false;
      await this.playAudio(url);
      this.isPlaying = true;
      this.song = song;
      this.interval();
    },

    async playMulti(ids: number[]) {
      this.clearPlayList();
      this.pushPlayList(ids);
      await this.play(ids[0]);
    },

    async playAudio(url: string) {
      this.audio.src = url;
      await this.audio.play();
    },
    //播放结束
    playEnd() {
      switch (this.loopType) {
        case 0:
          this.rePlay();
          break;
        case 1:
          this.next();
          break;
        case 2:
          this.randomPlay();
          break;
      }
    },

    fremoveSongFromPlaylist(songId: number) {
      const index = this.playList.findIndex((id) => id == songId);
      if (index !== -1) {
        this.playList.splice(index, 1);
      }
    },
     //重新播放
    rePlay() {
      setTimeout(() => {
        this.currentTime = 0;
        this.audio.play();
      }, 1000);
    },
    //下一曲
    async next() {
      if(this.nextSongId === this.id) return
      
      if (this.loopType === 2) {
        this.randomPlay();
      } else if (this.loopType === 0) {
        this.rePlay();
      } else {
        this.play(this.nextSongId);
      }
    },
    //上一曲
    prev() {
      this.play(this.prevSongId);
    },
    //随机播放
    async randomPlay() {
      const ramdomId = this.playList[Math.floor(Math.random() * this.playList.length)];
      const { success, message } = await checkMusic(ramdomId);
      if(!success) {
        notify({ message: message, type: "warning" });
        this.fremoveSongFromPlaylist(ramdomId);
        this.randomPlay();
        return
      }
      this.play(ramdomId);
    },
    //播放、暂停
    togglePlay() {
      if (!this.song.id) return;
      this.isPlaying = !this.isPlaying;
      if (!this.isPlaying) {
        this.audio.pause();
        this.isPause = true;
      } else {
        this.audio.play();
        this.isPause = false;
      }
    },
    setPlay() {
      if (!this.song.id) return;
      this.isPlaying = true;
      this.audio.play();
      this.isPause = false;
    },
    setPause() {
      if (!this.song.id) return;
      this.isPlaying = false;
      this.audio.pause();
      this.isPause = true;
    },
    //切换循环类型
    toggleLoop() {
      if (this.loopType === 2) {
        this.loopType = 0;
      } else {
        this.loopType++;
      }
    },
    //静音切换
    toggleMuted() {
      this.muted = !this.muted;
      this.audio.muted = this.muted;
    },
    //音量设置
    setVolume(n: number) {
      n = n > 100 ? 100 : n;
      n = n < 0 ? 0 : n;
      this.volume = n;
      this.audio.volume = n / 100;
    },
    //修改播放时间
    onSliderChange(val: number) {
      this.currentTime = val;
      this.sliderInput = false;
      this.audio.currentTime = val;
    },
    //播放时间拖动中
    onSliderInput(val: number) {
      this.sliderInput = true;
    },
    //定时器
    interval() {
      if (this.isPlaying && !this.sliderInput) {
        setInterval(() => {
          this.currentTime = parseInt(this.audio.currentTime.toString());
          this.duration = parseInt(this.audio.duration.toString());
          this.ended = this.audio.ended;
        }, 1000);
      }
    },
  },
});
