<template>
  <MenuBar></MenuBar>
  <div class="h-full w-full rounded-xl flex justify-around px-8 py-2 z-50">
    <div class="flex w-1/3 gap-2 items-center">
      <icon-park
        class="button-primary"
        :icon="Left"
        :size="24"
        @click="go('back')" />
      <icon-park
        class="button-primary"
        :icon="Right"
        :size="24"
        @click="go('forward')" />
      <icon-park
        class="button-primary"
        :icon="Tool"
        :size="12"
        @click="rebootApp"
        title="修复异常" />
    </div>
    <div class="flex w-1/3 gap-4 items-center justify-center font-bold">
      <div
        v-for="btn in headerBtns"
        class="button-primary"
        :class="{ 'button-active': curRoutePath == btn.path }"
        @click="routeTo(btn.path)">
        {{ btn.name }}
      </div>
    </div>
    <div class="flex w-1/3 justify-end gap-8 items-center">
      <div class="form-control">
        <div class="input-group input-group-sm group">
          <input
            type="text"
            placeholder="搜索"
            class="input input-sm focus:outline-none border-2 border-gray-200 border-r-0"
            @keypress.enter="handleSearch"
            v-model="searchKey" />
          <button
            @click="handleSearch"
            class="btn btn-circle btn-sm bg-white border-2 search-btn border-gray-200 hover:bg-gray-200 hover:border-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="gray">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
      <div
        v-if="avatar"
        tabindex="0"
        class="dropdown dropdown-bottom dropdown-end">
        <img
          :src="avatar"
          class="w-8 rounded-full cursor-pointer border-2 border-blue-200" />
        <ul
          tabindex="0"
          class="dropdown-content px-2 py-4 shadow rounded-xl w-32 bg-white">
          <li>
            <label
              @click="routeTo('/pan')"
              class="avatar-dropdown">
              <div class="text-base font-bold">我的云盘</div>
            </label>
          </li>
          <li>
            <label
              for="logout-modal"
              class="avatar-dropdown">
              <icon-park
                :icon="Logout"
                theme="filled"
                :size="16"
                class="rounded-full p-1" />
              <div class="text-base font-bold">退出</div>
            </label>
          </li>
        </ul>
      </div>
      <img
        v-else
        src="http://s4.music.126.net/style/web2/img/default/default_avatar.jpg?param=60y60"
        @click="routeTo('/login')"
        class="rounded-full w-8 h-8" />
    </div>
  </div>
  <ea-modal
    id="logout-modal"
    @confirm="doLogout">
    <h3 class="font-bold text-lg">确定退出登陆吗？</h3>
  </ea-modal>
</template>

<script setup lang="ts">
import { checkLoginStatus, routeTo, go, doLogout } from '@/utils/common'
import { Left, Right, Tool } from '@icon-park/vue-next'
import MenuBar from './Menubar.vue'
import { computed, onMounted, ref } from 'vue'
import pinia from '@/store/store'
import { Logout } from '@icon-park/vue-next'
import { useUserInfoStore, useSearchStore } from '@/store/index'
import router from '@/router'
import { searchByType, typeMap } from '@/api/search'

const userInfoStore = useUserInfoStore(pinia)
const searchStore = useSearchStore(pinia)

const avatar = computed(() => userInfoStore.getUserInfo?.avatarUrl)
const curRoutePath = computed(() => router.currentRoute.value.path)

const headerBtns = [
  {
    name: '首页',
    path: '/',
  },
  {
    name: '发现',
    path: '/explore',
  },
  {
    name: '我的',
    path: '/me',
  },
]

const searchKey = ref('')

const handleSearch = async () => {
  if (!searchKey.value) {
    return
  }
  if (
    searchKey.value == searchStore.getSearchKey &&
    curRoutePath.value == '/search'
  ) {
    return
  }
  searchStore.setSearchKey(searchKey.value)
  searchStore.clearSearchResult()
  typeMap.forEach(m => {
    searchByType(m.alias, 0)
  })
  routeTo(`/search`)
}

const rebootApp = () => {
  window.location.reload()
}

onMounted(async () => {
  // TODO 优化检测登陆状态的时机
  await checkLoginStatus()
})
</script>

<style lang="scss" scoped>
.avatar-dropdown {
  &:hover {
    background-color: rgb(234, 239, 253);
    color: rgb(51, 94, 234);
  }
  transition: all 300ms;
  display: flex;
  width: 100%;
  justify-content: center;
  border-radius: 0.75rem;
  padding-top: 0.5rem /* 8px */;
  padding-bottom: 0.5rem /* 8px */;
}

.search-btn {
}
</style>
