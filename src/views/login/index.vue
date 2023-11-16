<template>
  <div class="flex flex-col items-center">
    <div class="mt-8 font-bold text-2xl cursor-default">登录网易云账号</div>
    <img
      :src="imgSrc"
      class="w-48 h-48 mt-8 opacity-0 rounded-2xl"
      @load="addCls"
    />
    <div class="mt-4 text-base font-bold">
      打开<span
        class="text-blue-600 cursor-pointer hover:underline"
        @click="openUrl('https://music.163.com/#/download')"
        >网易云音乐</span
      >扫码登录
    </div>
  </div>
</template>

<script setup lang="ts">
import { routeTo, openUrl, setCookie, checkLoginStatus } from "@/utils/common";
import { onMounted, onUnmounted, ref } from "vue";
import { qrStatusApi, qrKeyApi, qrImgApi } from "./api";
import { useUserInfoStore } from "@/store";
import pinia from "@/store/store";

const userInfoStore = useUserInfoStore(pinia);

defineOptions({
  name: "login",
});

const imgSrc = ref<string>("");
const timer = ref();

const checkStatus = async (key: string) => {
  const res = await qrStatusApi({ key });
  return res;
};

const login = async () => {
  const res: any = await qrKeyApi();
  const params = {
    key: res.data.unikey,
    qrimg: "true",
  };
  const res2: any = await qrImgApi(params);
  imgSrc.value = res2.data.qrimg;

  timer.value = setInterval(async () => {
    const statusRes = (await checkStatus(res.data.unikey)) as any;
    if (statusRes.code === 800) {
      login();
      clearInterval(timer.value);
    }
    if (statusRes.code === 803) {
      const arr = statusRes.cookie.split(";");
      arr.forEach((item: any) => {
        const [key, value] = item.split("=");
        if (key !== null) {
          setCookie(key, value);
        }
      });
      await checkLoginStatus();
      userInfoStore.setLogin(true);
      routeTo("/");
      clearInterval(timer.value);
    }
  }, 2000);
};

const addCls = (e: Event) => {
  const target = e.target as HTMLImageElement;
  // 添加一个类
  target.classList.add("gradual-appear");
};

const getLoginStatus = async () => {
  if (localStorage.getItem("user")) {
    routeTo("/");
  }
};

onMounted(() => {
  login();
  getLoginStatus();
});

onUnmounted(() => {
  clearInterval(timer.value);
});
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  width: 200px;
  height: 200px;
}

.gradual-appear {
  opacity: 1;
  transition: all 300ms linear;
}
</style>
