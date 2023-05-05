import { getMusicDetail, getMusicUrl } from "@/api/music";
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

export const usePlayerStore = defineStore({
  id: "player",
  state: () => ({
    audio: new Audio(),
    loopType: 1, //循环模式 0 单曲循环 1 列表循环 2随机播放
    volume: 60, //音量
    playList: [] as any[], //播放列表,
    showPlayList: false,
    id: 0,
    url: "",
    songUrl: {} as any,
    song: {} as any,
    isPlaying: false, //是否播放中
    isPause: false, //是否暂停
    sliderInput: false, //是否正在拖动进度条
    ended: false, //是否播放结束
    muted: false, //是否静音
    currentTime: 0, //当前播放时间
    duration: 0, //总播放时长
  }),
  getters: {
    playListCount: (state) => {
      return state.playList.length;
    },
    thisIndex: (state) => {
      for (let i = 0; i < state.playList.length; i++) {
        if (state.playList[i].id == state.id) {
          return i;
        }
      }
      return -1;
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
    pushPlayList(replace: boolean, ...list: any[]) {
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
      }, 500);
    },
    async play(id: number) {
      if (id == this.id) return;
      this.isPlaying = false;
      const url = await getMusicUrl(id);
      console.log(url);
      if (url == "") {
        // ElMessage.error("播放失败");
        // this.randomPlay();
        return;
      }
      this.audio.src = url;
      this.audio
        .play()
        .then((res) => {
          this.isPlaying = true;
          this.songUrl = url;
          this.url = url;
          this.id = id;
          this.songDetail();
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
    async songDetail() {
      this.song = await getMusicDetail(this.id);
      const playListItem = {
        id: this.song.id,
        name: this.song.name,
        picUrl: this.song.al.picUrl,
        singers: this.song.ar.map((item: any) => {
          return { name: item.name, id: item.id };
        }),
        duration: this.song.dt,
      };

      this.pushPlayList(false, playListItem);
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

