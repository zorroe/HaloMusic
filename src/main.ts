import "@/style.scss";
import "@/assets/css/global.scss";
import "@/samples/node-api";
import { createApp } from "vue";
import App from "@/App.vue";
import router from "@/router/index"
import Image from "@/components/common/Image.vue";
import IconPark from "@/components/common/IconPark.vue";
import PlayListCover from "@/components/common/PlayListCover.vue";
import ArtistCover from "@/components/common/ArtistCover.vue";
import AlbumCover from "@/components/common/AlbumCover.vue";
import TopListCover from "@/components/common/TopListCover.vue";
import MusicTable from "@/components/common/MusicTable.vue";

createApp(App)
  .component("icon-park", IconPark)
  .component("play-list-cover", PlayListCover)
  .component("artist-cover", ArtistCover)
  .component("album-cover", AlbumCover)
  .component("top-list-cover", TopListCover)
  .component("music-table", MusicTable)
  .component("lmg", Image)
  .use(router)
  .mount("#app")
  .$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");
  });
