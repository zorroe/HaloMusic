import type { UserProfile } from '@/types/userRel'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export const useUserInfoStore = defineStore('userInfo', () => {
  const userInfo = ref<UserProfile>()
  const isLogin = useLocalStorage('isLogin', false)

  const setUserInfo = (info: UserProfile) => {
    userInfo.value = info
  }

  const setLogin = (val: boolean) => {
    isLogin.value = val
  }

  const getUserInfo = computed(() => {
    return userInfo.value
  })

  return {
    userInfo,
    isLogin,
    setLogin,
    getUserInfo,
    setUserInfo,
  }
})

export const useSearchStore = defineStore('search', () => {
  const searchKey = ref<string>('')
  const searchResult = ref<any>({
    song: { count: 0, s: [] },
    album: { count: 0, s: [] },
    artist: { count: 0, s: [] },
    playlist: { count: 0, s: [] },
    userprofile: { count: 0, s: [] },
    mv: { count: 0, s: [] },
  })

  const setSearchKey = (key: string) => {
    searchKey.value = key
  }

  const setSearchResult = (typeC: string, result: any) => {
    searchResult.value[typeC].count = result[`${typeC}Count`]
    searchResult.value[typeC].s.push(...result[`${typeC}s`])
  }

  const clearSearchResult = () => {
    searchResult.value = {
      song: { count: 0, s: [] },
      album: { count: 0, s: [] },
      artist: { count: 0, s: [] },
      playlist: { count: 0, s: [] },
      userprofile: { count: 0, s: [] },
      mv: { count: 0, s: [] },
    }
  }

  const getSearchKey = computed(() => {
    return searchKey.value
  })

  const getSearchResult = computed(() => {
    return searchResult.value
  })

  return {
    searchKey,
    setSearchKey,
    getSearchKey,
    setSearchResult,
    getSearchResult,
    clearSearchResult,
  }
})
