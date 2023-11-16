import { router } from "@/router/index";
import { loginStatusApi, logoutApi } from "@/views/login/api";
import { ipcRenderer } from "electron";
import Cookies from "js-cookie";
import pinia from "@/store/store";
import { useUserInfoStore, usePlayerStore } from "@/store/index";
import { getPlayListByUidApi } from "@/views/me/api";
import { getPlayListAllApi } from "@/api/playList";
import { UserProfile } from "@/types/userRel";
import { checkMusicApi, getMusicUrlApi } from "@/api/music";
import { getSubAlbumlistApi } from "@/api/album";

const userInfoStore = useUserInfoStore(pinia);
const playerStore = usePlayerStore(pinia);

export const routeTo = (path: string) => {
  console.log(path);
  router.push(path);
};

export const go = (where: String) => {
  if (where === "forward") {
    router.go(1);
  } else if (where === "back") {
    router.go(-1);
  } else {
    router.go(0);
  }
};

export const sleep = (numberMillis: number) => {
  var now = new Date();
  var exitTime = now.getTime() + numberMillis;
  while (true) {
    now = new Date();
    if (now.getTime() > exitTime) return;
  }
};

export const openUrl = (url: string) => {
  ipcRenderer.send("open-url", url);
};

export const handleLogin = () => {
  routeTo("/login");
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

export const clearAllCookie = ()=>{
  var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
  if(keys) {
    for(var i = keys.length; i--;)
      document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString()
  }
}

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
  clearAllCookie();
  clearLocalStorage();
  userInfoStore.setLogin(false);
  userInfoStore.setUserInfo({} as UserProfile);
  playerStore.clearPlayList();
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

export const saveSubAlbumIds = async () => {
  const params = {
    offset: 0,
    limit: 999,
  };
  const ids: number[] = [];
  const { data } = await getSubAlbumlistApi(params);
  data.forEach((item: any) => {
    ids.push(item.id);
  });
  localStorage.setItem("subAlbumIds", JSON.stringify(ids));
};

export function formatTrackTime(value: number) {
  if (!value) return "";
  let min = ~~(value / 60);
  let sec = (~~(value % 60)).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export const checkMusic: any = async (id: number) => {
  const checkStatus = await checkMusicApi(id);
  const musicUrl = await getMusicUrlApi({ id, level: "exhigh" });
  if (
    !musicUrl.data[0] ||
    !musicUrl.data[0].url ||
    musicUrl.data[0].freeTrialInfo !== null
  ) {
    return { success: false, message: "暂无资源" };
  }
  return checkStatus;
};
