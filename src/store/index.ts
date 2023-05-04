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

