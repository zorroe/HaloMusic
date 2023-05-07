import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/home/index.vue"),
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/login/index.vue"),
  },
  {
    path: "/me",
    name: "me",
    component: () => import("@/views/me/index.vue"),
  },
  {
    // 传入歌手id
    path: "/artist/:id",
    name: "artist",
    component: () => import("@/views/artist/index.vue"),
  },
  {
    // 传入歌单id
    path: "/playlist/:id",
    name: "playlist",
    component: () => import("@/views/playlist/index.vue"),
  },
  {
    path: "/recommendMusic",
    name: "recommendMusic",
    component: () => import("@/views/playlist/recommendMusic.vue"),
  },
  {
    path: "/album/:id",
    name: "album",
    component: () => import("@/views/album/index.vue"),
  },
  {
    path:"/curPlayList",
    name:"curPlayList",
    component:()=>import("@/components/common/CurPlayList.vue")
  }
];
export const router = createRouter({
  history: createWebHashHistory(),
  routes: routes,
});

export default router;
