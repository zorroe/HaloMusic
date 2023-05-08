import {
  getAudioSourceFromNetease,
  getMusicDetail,
} from "@/api/music";
import { MusicBaseInfo } from "@/types/musicRel";
import { UserProfile } from "@/types/userRel";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

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
    playList: [] as MusicBaseInfo[], //播放列表,
    showPlayList: false,
    id: 0,
    url: "",
    songUrl: {} as string,
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
      return state.playList.findIndex((item) => item.id == state.id);
    },
    nextSongId(state): any {
      const { thisIndex, playListCount } = this;
      if (thisIndex == playListCount - 1) {
        return state.playList[0]?.id;
      } else {
        const nextIndex: number = thisIndex + 1;
        return state.playList[nextIndex]?.id;
      }
    },
    prevSongId(state): any {
      const { thisIndex } = this;
      if (thisIndex == 0) {
        return state.playList[state.playList.length - 1]?.id;
      } else {
        const prevIndex: number = thisIndex - 1;
        return state.playList[prevIndex]?.id;
      }
    },
  },
  actions: {
    init() {
      this.audio.volume = this.volume / 100;
    },
    //播放列表里面添加音乐
    pushPlayList(replace: boolean, ...list: MusicBaseInfo[]) {
      if (replace) {
        this.playList = list;
        return;
      }
      list.forEach((song) => {
        if (this.playList.filter((s) => s.id == song.id).length <= 0) {
          this.playList.push(song);
        }
      });
    },
    clearPlayList() {
      this.songUrl = {} as any;
      this.url = "";
      this.id = 0;
      this.song = {} as any;
      this.isPlaying = false;
      this.isPause = false;
      this.sliderInput = false;
      this.ended = false;
      this.muted = false;
      this.currentTime = 0;
      this.playList = [] as any[];
      this.showPlayList = false;
      this.audio.load();
      setTimeout(() => {
        this.duration = 0;
      }, 100);
    },
    async play(id: number) {
      this.id = id;
      this.isPlaying = false;
      const url = await getAudioSourceFromNetease(id);
      if (!url) {
        // 播放下一首
        this.getErrorCount++;
        if (this.getErrorCount > 8) {
          this.clearPlayList();
        } else {
          this.next();
        }
        return;
      }
      this.getErrorCount = 0;
      this.audio.src = url;
      this.audio
        .play()
        .then(async () => {
          this.isPlaying = true;
          this.songUrl = url;
          this.url = url;
          await this.songDetail();
          this.interval();
        })
        .catch((res) => {});
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
    // 停止播放
    async playStop() {},
    async songDetail() {
      this.song = await getMusicDetail(this.id);
      this.pushPlayList(false, this.song);
    },
    //重新播放
    rePlay() {
      setTimeout(() => {
        this.currentTime = 0;
        this.audio.play();
      }, 1000);
    },
    //下一曲
    next() {
      if (this.loopType == 2) {
        this.randomPlay();
      } else if (this.loopType == 0) {
        this.play(this.id);
      } else {
        this.play(this.nextSongId);
      }
    },
    //上一曲
    prev() {
      this.play(this.prevSongId);
    },
    //随机播放
    randomPlay() {
      this.play(
        this.playList[Math.floor(Math.random() * this.playListCount)].id
      );
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
      if (this.loopType == 2) {
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
