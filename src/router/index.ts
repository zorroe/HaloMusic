import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserInfoStore } from '@/store'
import pinia from '@/store/store'

declare module 'vue-router' {
  interface RouteMeta {
    /** 浏览器标题（会拼接上应用名） */
    title?: string
    /** 是否需要登录；显式 false 表示游客可访问 */
    requiresAuth?: boolean
  }
}

const APP_NAME = 'HaloMusic'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/index.vue'),
    meta: { title: '首页', requiresAuth: true },
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('@/views/explore/index.vue'),
    meta: { title: '发现', requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/me',
    name: 'me',
    component: () => import('@/views/me/index.vue'),
    meta: { title: '我的音乐', requiresAuth: true },
  },
  {
    // 传入歌手id
    path: '/artist/:id',
    name: 'artist',
    component: () => import('@/views/artist/index.vue'),
    meta: { title: '歌手', requiresAuth: true },
  },
  {
    path: '/artistTracks/:id',
    name: 'artistTrack',
    component: () => import('@/views/artist/tracks.vue'),
    meta: { title: '歌手歌曲', requiresAuth: true },
  },
  {
    // 传入歌单id
    path: '/playlist/:id',
    name: 'playlist',
    component: () => import('@/views/playlist/index.vue'),
    meta: { title: '歌单', requiresAuth: true },
  },
  {
    path: '/recommendMusic',
    name: 'recommendMusic',
    component: () => import('@/views/playlist/recommendMusic.vue'),
    meta: { title: '每日推荐', requiresAuth: true },
  },
  {
    path: '/album/:id',
    name: 'album',
    component: () => import('@/views/album/index.vue'),
    meta: { title: '专辑', requiresAuth: true },
  },
  {
    path: '/mv/:id',
    name: 'mv',
    component: () => import('@/views/mv/index.vue'),
    meta: { title: 'MV', requiresAuth: true },
  },
  {
    path: '/curPlayList',
    name: 'curPlayList',
    component: () => import('@/components/common/CurPlayList.vue'),
    meta: { title: '当前播放', requiresAuth: true },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/search/index.vue'),
    meta: { title: '搜索', requiresAuth: true },
  },
  {
    // 兜底 404：放在最后
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/notfound/index.vue'),
    meta: { title: '页面不存在', requiresAuth: true },
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 75, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(to => {
  const userInfoStore = useUserInfoStore(pinia)
  if (to.meta.requiresAuth === false) return true
  if (userInfoStore.isLogin) return true
  return { name: 'login', query: { redirect: to.fullPath } }
})

router.afterEach(to => {
  const title = to.meta.title
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
})

export default router
