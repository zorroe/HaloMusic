import { router } from "@/router/index";
import { loginStatusApi, logoutApi } from "@/views/login/api";
import { ipcRenderer } from "electron";
import Cookies from "js-cookie";
import pinia from "@/store/store";
import { useUserInfoStore, usePlayerStore } from "@/store/index";
import { getPlayListByUidApi } from "@/views/me/api";
import { getPlayListAllApi } from "@/api/playList";
import { UserProfile } from "@/types/userRel";
import dayjs from "dayjs";
import { getMusicDetailApi } from "@/api/music";

const userInfoStore = useUserInfoStore(pinia);
const playerStore = usePlayerStore(pinia);

export const routeTo = (path: string) => {
  router.push(path);
};

export const openUrl = (url: string) => {
  ipcRenderer.send("open-url", url);
};

export const handleLogin = () => {
  console.log("handleLogin");
};

export const setCookie = (key: string, value: string) => {
  // 设置过期时间为30天
  Cookies.set(key, value, { expires: 30 });
};

export const getCookie = (key: string) => {
  return Cookies.get(key) || "";
};

export const removeCookie = (key: string) => {
  Cookies.remove(key);
};

export const clearLocalStorage = () => {
  localStorage.clear();
};

export const checkLoginStatus = async () => {
  const res: any = await loginStatusApi();
  if (res.data.profile !== null) {
    localStorage.setItem("user", JSON.stringify(res.data.profile));
    userInfoStore.setUserInfo(res.data.profile);
  } else {
    localStorage.removeItem("user");
    userInfoStore.setUserInfo({} as UserProfile);
    routeTo("/login");
  }
};

export const doLogout = async () => {
  await logoutApi();
  removeCookie("MUSIC_U");
  removeCookie("__csrf");
  clearLocalStorage();
  await checkLoginStatus();
};

export const saveLikeMusicIds = async () => {
  const user = JSON.parse(localStorage.getItem("user") || "");
  const res: any = await getPlayListByUidApi({
    uid: user.userId,
  });
  const likePlayListId = res.playlist[0].id;
  localStorage.setItem("likePlayListId", likePlayListId);
  const { songs } = await getPlayListAllApi({ id: likePlayListId });
  const ids = songs.map((song: any) => {
    return song.id;
  });
  localStorage.setItem("likeMusicIds", JSON.stringify(ids));
};

export function formatTrackTime(value: number) {
  if (!value) return "";
  let min = ~~(value / 60);
  let sec = (~~(value % 60)).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

// 根据歌单id往播放列表里面添加歌曲
// 播放整个歌单的时候，会清空原有歌曲列表，然后添加新的歌曲列表
export async function playAll(id: number) {
  const { songs } = await getPlayListAllApi({ id });
  playerStore.clearPlayList();
  songs.forEach((song: any) => {
    playerStore.pushPlayList(false, {
      id: song.id,
      name: song.name,
      picUrl: song.al.picUrl,
      singers: song.ar.map((ar: any) => {
        return {
          id: ar.id,
          name: ar.name,
        };
      }),
      duration: dayjs(song.dt).format("mm:ss"),
      album: {
        id: song.al.id,
        name: song.al.name,
      },
    });
  });
  playerStore.play(playerStore.playList[0].id);
}

// 点击单首歌曲时，往播放列表里面添加歌曲
// 播放单首歌曲的时候，不会清空原有歌曲列表，只会添加一首歌曲
export async function playOne(id: number) {
  // 判断当前的播放列表中是否已经存在该歌曲
  const isExist = playerStore.playList.some((song) => {
    return song.id === id;
  });
  if(isExist) {
    playerStore.play(id);
    return;
  }
  const { songs } = await getMusicDetailApi(id);
  const song = songs[0];
  playerStore.playList.splice(playerStore.thisIndex + 1, 0, {
    id: song.id,
    name: song.name,
    picUrl: song.al.picUrl,
    singers: song.ar.map((ar: any) => {
      return {
        id: ar.id,
        name: ar.name,
      };
    }),
    duration: dayjs(song.dt).format("mm:ss"),
    album: {
      id: song.al.id,
      name: song.al.name,
    },
  });
  playerStore.play(id);
}
