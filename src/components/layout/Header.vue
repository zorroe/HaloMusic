<template>
  <MenuBar></MenuBar>
  <div class="h-full w-full rounded-xl flex justify-around px-8 py-2 z-50">
    <div class="flex w-1/3 gap-2 items-center">
      <icon-park
        class="button-primary"
        :icon="Left"
        :size="24"
        title="后退"
        @click="go('back')" />
      <icon-park
        class="button-primary"
        :icon="Right"
        :size="24"
        title="前进"
        @click="go('forward')" />
      <icon-park
        class="button-primary"
        :icon="Tool"
        :size="12"
        title="重新加载"
        @click="rebootApp" />
    </div>
    <div class="flex w-1/3 gap-4 items-center justify-center font-bold">
      <div
        v-for="btn in headerBtns"
        :key="btn.path"
        class="button-primary"
        :class="{ 'button-active': curRoutePath === btn.path }"
        @click="routeTo(btn.path)">
        {{ btn.name }}
      </div>
    </div>
    <div class="flex w-1/3 justify-end gap-6 items-center">
      <!-- 搜索框：daisyUI 5 移除了 form-control / input-group，这里用纯 CSS 自绘 -->
      <div class="search-box">
        <input
          v-model="searchKey"
          class="search-input"
          type="text"
          placeholder="搜索"
          aria-label="搜索"
          @keydown.enter="handleSearch" />
        <button
          type="button"
          class="search-btn"
          aria-label="搜索"
          @click="handleSearch">
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
      <div
        ref="avatarRef"
        class="relative flex items-center">
        <img
          :src="avatarSrc"
          class="w-8 h-8 rounded-full cursor-pointer border-2 border-blue-200 object-cover"
          alt="用户头像"
          title="用户菜单"
          @error="handleAvatarError"
          @click="handleAvatarClick" />
        <ul
          v-if="showMenu"
          class="avatar-menu">
          <li>
            <label
              for="logout-modal"
              class="avatar-dropdown"
              @click="handleLogout">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Left, Logout, Right, Tool } from '@icon-park/vue-next'
import MenuBar from './Menubar.vue'
import pinia from '@/store/store'
import { useSearchStore, useUserInfoStore } from '@/store/index'
import { routeTo, go } from '@/utils/common'
import { normalizeImageUrl } from '@/views/shared/mappers'
import defaultAvatar from '@/assets/icons/default_avatar.png'
import router from '@/router'

defineOptions({
  name: 'header',
})

const userInfoStore = useUserInfoStore(pinia)
const searchStore = useSearchStore(pinia)

const avatarRef = ref<HTMLElement | null>(null)
const showMenu = ref(false)
const avatarFailed = ref(false)
const searchKey = ref(searchStore.searchKey)

const headerBtns = [
  { name: '首页', path: '/' },
  { name: '发现', path: '/explore' },
  { name: '我的', path: '/me' },
]

const curRoutePath = computed(() => router.currentRoute.value.path)

const isLogin = computed(() => !!userInfoStore.isLogin)

const remoteAvatar = computed(() =>
  normalizeImageUrl(userInfoStore.userInfo?.avatarUrl)
)

const avatarSrc = computed(() => {
  if (avatarFailed.value || !remoteAvatar.value) return defaultAvatar
  return remoteAvatar.value
})

/** 搜到的结果页和输入框保持一致（比如从搜索页返回后再次进来） */
watch(
  () => searchStore.searchKey,
  value => {
    if (value && value !== searchKey.value) searchKey.value = value
  }
)

const handleAvatarError = () => {
  avatarFailed.value = true
}

const handleAvatarClick = () => {
  if (!isLogin.value) {
    routeTo('/login')
    return
  }
  showMenu.value = !showMenu.value
}

const handleLogout = () => {
  // label 的默认动作（toggle 退出登录弹窗的 checkbox）在事件派发结束后执行，
  // 这里延后到下一 tick 再收起菜单，避免 label 被移除导致弹窗打不开
  nextTick(() => {
    showMenu.value = false
  })
}

const handleSearch = () => {
  const key = searchKey.value.trim()
  if (!key) return
  const currentPath = router.currentRoute.value.path
  if (searchStore.searchKey === key && currentPath === '/search') return
  // 具体请求由搜索页统一发起（并发 + loading + 空态在页面内处理）
  searchStore.setSearchKey(key)
  searchStore.clearSearchResult()
  if (currentPath !== '/search') routeTo('/search')
}

const rebootApp = () => {
  window.location.reload()
}

const handleDocumentClick = (event: MouseEvent) => {
  if (!showMenu.value) return
  const target = event.target as Node | null
  if (target && avatarRef.value && !avatarRef.value.contains(target)) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.search-box {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 36px;
  padding: 0 2px 0 12px;
  border: 2px solid #e5e7eb;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.9);
  transition: border-color 300ms;
}

.search-box:focus-within {
  border-color: #9ca3af;
}

.search-input {
  width: 140px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text);
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background: transparent;
  cursor: pointer;
  transition: background-color 300ms;
}

.search-btn:hover {
  background-color: #e5e7eb;
}

.avatar-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 9500;
  width: 128px;
  margin: 0;
  padding: 8px;
  list-style: none;
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

.avatar-dropdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 8px 0;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 300ms;
}

.avatar-dropdown:hover {
  background-color: rgb(234, 239, 253);
  color: rgb(51, 94, 234);
}
</style>
