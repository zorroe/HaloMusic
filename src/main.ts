import "@/style.scss";
import "@/assets/css/global.scss";
import "@/assets/css/slider.css"
import "video.js/dist/video-js.min.css";
import { createApp } from "vue";
import App from "@/App.vue";
import pinia from "./store/store";
import router from "@/router/index";
import Image from "@/components/common/Image.vue";
import IconPark from "@/components/common/IconPark.vue";
import PlayListCover from "@/components/common/PlayListCover.vue";
import ArtistCover from "@/components/common/ArtistCover.vue";
import AlbumCover from "@/components/common/AlbumCover.vue";
import TopListCover from "@/components/common/TopListCover.vue";
import UserCover from "@/components/common/UserProfileCover.vue"
import MusicTable from "@/components/common/MusicTable.vue";
import MvCover from "@/components/common/MvCover.vue";
import EaButton from "@/components/common/EaButton.vue";
import EaModal from "@/components/common/EaModal.vue";
import EaDrawer from "@/components/common/drawer/EaDrawer.vue"

import VueSlider from 'vue-slider-component'
import VueVideoPlayer from '@videojs-player/vue'
import 'video.js/dist/video-js.css'

createApp(App)
  .component("icon-park", IconPark)
  .component("play-list-cover", PlayListCover)
  .component("artist-cover", ArtistCover)
  .component("album-cover", AlbumCover)
  .component("top-list-cover", TopListCover)
  .component("music-table", MusicTable)
  .component("mv-cover", MvCover)
  .component("lmg", Image)
  .component("ea-button",EaButton)
  .component("ea-modal",EaModal)
  .component("ea-drawer",EaDrawer)
  .component("vue-slider",VueSlider)
  .component("user-cover",UserCover)
  .use(router)
  .use(pinia)
  .use(VueVideoPlayer)
  .mount("#app")
  .$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");
  });
