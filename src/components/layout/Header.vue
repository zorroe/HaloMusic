<template>
  <div class="topbar">
    <div class="topbar-left">
      <button
        type="button"
        class="topbar-icon"
        title="后退"
        aria-label="后退"
        @click="go('back')">
        <icon-park
          :icon="Left"
          :size="18"
          theme="outline"
          fill="currentColor" />
      </button>
      <button
        type="button"
        class="topbar-icon"
        title="前进"
        aria-label="前进"
        @click="go('forward')">
        <icon-park
          :icon="Right"
          :size="18"
          theme="outline"
          fill="currentColor" />
      </button>
      <span class="topbar-title">{{ pageTitle }}</span>
    </div>

    <div class="topbar-right">
      <div class="search-box">
        <input
          v-model="searchKey"
          class="search-input"
          type="text"
          placeholder="搜索歌曲、歌手、歌单…"
          aria-label="搜索"
          @keydown.enter="handleSearch" />
        <button
          type="button"
          class="search-submit"
          aria-label="搜索"
          @click="handleSearch">
          <icon-park
            :icon="Search"
            :size="16"
            theme="outline"
            fill="currentColor" />
        </button>
      </div>

      <div
        ref="avatarRef"
        class="avatar-wrap">
        <img
          :src="avatarSrc"
          class="avatar-img"
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
              class="avatar-item"
              @click="handleLogout">
              <icon-park
                :icon="Logout"
                theme="filled"
                :size="15" />
              <span>退出登录</span>
            </label>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Left, Logout, Right, Search } from '@icon-park/vue-next'
import pinia from '@/store/store'
import { useSearchStore, useUserInfoStore } from '@/store/index'
import { routeTo, go } from '@/utils/common'
import { normalizeImageUrl } from '@/views/shared/mappers'
import defaultAvatar from '@/assets/icons/default_avatar.png'
import router from '@/router'

defineOptions({
  // 不能用 'header'：与 HTML 内建元素同名，Vue 会告警
  name: 'appHeader',
})

const userInfoStore = useUserInfoStore(pinia)
const searchStore = useSearchStore(pinia)

const avatarRef = ref<HTMLElement | null>(null)
const showMenu = ref(false)
const avatarFailed = ref(false)
const searchKey = ref(searchStore.searchKey)

const currentRoute = computed(() => router.currentRoute.value)
const pageTitle = computed(() => {
  const title = currentRoute.value.meta?.title
  return typeof title === 'string' && title ? title : 'HaloMusic'
})

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
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 100%;
  padding: 0 20px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.topbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.topbar-icon:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.topbar-title {
  margin-left: 10px;
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  width: 240px;
  height: 34px;
  padding: 0 4px 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background-color: var(--color-input-bg);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    width var(--motion-base) var(--ease-standard);
}

.search-box:focus-within {
  border-color: var(--color-primary);
  width: 300px;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.8125rem;
}

.search-input::placeholder {
  color: var(--color-text-subtle);
}

.search-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: none;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.search-submit:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

/* 头像与下拉菜单 */
.avatar-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.avatar-img {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  object-fit: cover;
  cursor: pointer;
  border: 1px solid var(--color-border);
  transition: transform var(--motion-fast) var(--ease-standard);
}

.avatar-img:hover {
  transform: scale(1.06);
}

.avatar-menu {
  position: absolute;
  top: 40px;
  right: 0;
  z-index: 50;
  min-width: 132px;
  padding: 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-card-bg-strong);
  box-shadow: var(--shadow-md);
  animation: halo-pop-in var(--motion-base) var(--ease-enter) both;
}

.avatar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.avatar-item:hover {
  background-color: var(--color-hover);
  color: var(--color-primary);
}
</style>
