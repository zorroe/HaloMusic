import { router } from "@/router/index";
import { loginStatusApi, logoutApi } from "@/views/login/api";
import { ipcRenderer } from "electron";
import Cookies from "js-cookie";
import pinia from "@/store/store";
import { useUserInfoStore } from "@/store/index";
import { getPlayListByUidApi } from "@/views/me/api";
import { getPlayListAllApi } from "@/api/playList";
import { UserProfile } from "@/types/userRel";

const userInfoStore = useUserInfoStore(pinia);

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
  if (!confirm("确定要退出登录吗？")) return;
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
