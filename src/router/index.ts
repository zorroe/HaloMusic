import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserInfoStore } from '@/store'
import pinia from '@/store/store'
import { nextTick } from 'vue'

const userInfoStore = useUserInfoStore(pinia)

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/index.vue'),
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('@/views/explore/index.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
  },
  {
    path: '/me',
    name: 'me',
    component: () => import('@/views/me/index.vue'),
  },
  {
    // 传入歌手id
    path: '/artist/:id',
    name: 'artist',
    component: () => import('@/views/artist/index.vue'),
  },
  {
    path: '/artistTracks/:id',
    name: 'artistTrack',
    component: () => import('@/views/artist/tracks.vue'),
  },
  {
    // 传入歌单id
    path: '/playlist/:id',
    name: 'playlist',
    component: () => import('@/views/playlist/index.vue'),
  },
  {
    path: '/recommendMusic',
    name: 'recommendMusic',
    component: () => import('@/views/playlist/recommendMusic.vue'),
  },
  {
    path: '/album/:id',
    name: 'album',
    component: () => import('@/views/album/index.vue'),
  },
  {
    path: '/mv/:id',
    name: 'mv',
    component: () => import('@/views/mv/index.vue'),
  },
  {
    path: '/curPlayList',
    name: 'curPlayList',
    component: () => import('@/components/common/CurPlayList.vue'),
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/search/index.vue'),
  },
  {
    path: '/test',
    name: 'test',
    component: () => import('@/views/test/index.vue'),
  },
  {
    path: '/pan',
    name: 'pan',
    component: ()=> import('@/views/pan/index.vue')
  }
]
export const router = createRouter({
  history: createWebHashHistory(),
  routes: routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return {
      top: 0,
    }
  },
})

router.beforeEach((to, from, next) => {
  if (to.name === 'login') {
    next()
  } else {
    if (userInfoStore.isLogin) {
      next()
    } else {
      next({ name: 'login' })
    }
  }
})

export default router
