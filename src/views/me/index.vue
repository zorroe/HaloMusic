<template>
  <div v-show="isLoaded" class="flex flex-col w-full gap-8">
    <div class="flex gap-4 items-center">
      <img class="w-10 h-10 rounded-full" :src="user.avatarUrl" />
      <div class="font-bold text-3xl">{{ `${user.nickname}的音乐库` }}</div>
    </div>
    <div class="flex gap-4 items-center">
      <div
        class="items-between w-1/3 h-48 like-card cursor-pointer"
        @click="routeTo(`/playlist/${likePlayListId}`)"
      >
        <div class="flex-grow text-sm whitespace-pre-wrap">
          {{ randomLyric }}
        </div>
        <div class="flex justify-between items-center w-full">
          <div class="flex flex-col">
            <div class="font-bold">我喜欢的音乐</div>
            <div>{{ `共${likeCount}首` }}</div>
          </div>
          <icon-park
            :icon="PlayOne"
            fill="white"
            theme="filled"
            :size="24"
            class="btn-play rounded-full p-2"
          ></icon-park>
        </div>
      </div>
      <div
        class="grid-cols-3 grid place-content-center w-2/3 h-48 rounded-xl gap-1"
      >
        <div
          v-for="item in likeList.slice(0, 12)"
          class="rounded-xl like-music flex items-center cursor-pointer"
        >
          <img class="w-8 h-8 rounded" :src="item.picUrl" />
          <div class="flex flex-col justify-center px-2">
            <div class="font-bold text-sm">{{ item.name }}</div>
            <div class="text-xs flex gap-1 text-gray-600 active:text-gray-800">
              <span
                v-for="ar in item.singers"
                class="hover:underline"
                @click="routeTo(`/artist/${ar.id}`)"
              >
                {{ ar.name }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="tabs">
      <a
        v-for="tab in tabs"
        :id="tab.id"
        :class="{ 'active-tab': activeTab == tab.id }"
        class="tab tab-bordered w-20 min-w-max font-bold text-lg text-gray-600 hover:text-gray-800"
        @click="handleClickTab(tab.id)"
        >{{ tab.name }}</a
      >
    </div>
    <div v-show="activeTab == '1'" class="grid-cols-5 grid gap-4">
      <play-list-cover
        v-for="item in myPlayList"
        :data="item"
      ></play-list-cover>
    </div>
    <div v-show="activeTab == '2'">
      <div class="grid-cols-5 grid place-items-center gap-4">
      <album-cover v-for="item in albumSubList" :data="item"></album-cover>
    </div>
    </div>
    <div v-show="activeTab == '3'">
      <div class="grid-cols-6 grid place-items-center gap-3">
        <artist-cover v-for="item in artistSubList" :data="item"></artist-cover>
      </div>
    </div>
    <div v-show="activeTab == '4'">
      <div><mv-cover v-for="item in mvSubList" :data="item"></mv-cover></div>
    </div>
    <div v-show="activeTab == '5'">
      <div><music-table :data="musicHistoryData"></music-table></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayOne } from "@icon-park/vue-next";
import { onBeforeMount, onMounted, ref } from "vue";
import {
  getAlbumSubListApi,
  getArtistSubListApi,
  getLikeListApi,
  getListenHistoryApi,
  getMvSubListApi,
  getPlayListByUidApi,
} from "./api";
import { routeTo } from "@/utils/common";
import { PlayListBaseInfo } from "@/types/playListRel";
import { MusicBaseInfo } from "@/types/musicRel";
import { getPlayListAllApi } from "@/api/playList";
import { getLyricApi } from "@/api/music";
import { ArtistBaseInfo } from "@/types/artistRel";
import dayjs from "dayjs";
import { MvBaseInfo } from "@/types/mvRel";
import { AlbumBaseInfo } from "@/types/albumRel";

const user = ref();
const isLoaded = ref(false);
const historyType = ref<0 | 1>(1);
const musicHistoryData = ref<MusicBaseInfo[]>([]);

defineOptions({
  name: 'me',
})

const init = () => {
  user.value = JSON.parse(localStorage.getItem("user") || "");
};

const activeTab = ref("1");

const tabs = [
  { id: "1", name: "全部歌单", do: () => {} },
  {
    id: "2",
    name: "专辑",
    do: () => {
      getAlbumSubList();
    },
  },
  {
    id: "3",
    name: "艺人",
    do: () => {
      getArtistSubList();
    },
  },
  {
    id: "4",
    name: "MV",
    do: () => {
      getMvSubList();
    },
  },
  {
    id: "5",
    name: "听歌排行",
    do: () => {
      getListenHistory(historyType.value);
    },
  },
];

// 喜欢的歌曲列表
const likeList = ref<MusicBaseInfo[]>([]);
const likeCount = ref("");

const myPlayList = ref<PlayListBaseInfo[]>([]);
const randomLyric = ref<string>("");

// 我喜欢的音乐也是一个歌单，这个歌单的id
const likePlayListId = localStorage.getItem("likePlayListId");
const artistSubList = ref<ArtistBaseInfo[]>([]);
const mvSubList = ref<MvBaseInfo[]>([]);
const albumSubList = ref<AlbumBaseInfo[]>([]);

const getPlayListByUid = async () => {
  const res: any = await getPlayListByUidApi({
    uid: user.value.userId,
  });
  // 我的所有歌单（创建的，收藏的）
  res.playlist.slice(1).forEach((item: any) => {
    myPlayList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.coverImgUrl,
      playCount: item.playCount,
      creator: {
        id: item.creator.userId,
        nickname: item.creator.nickname,
      },
    });
  });
  const playListDetail = await getPlayListAllApi({ id: likePlayListId });
  playListDetail.songs.forEach((item: any) => {
    likeList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.al.picUrl,
      singers: item.ar.map((item: any) => {
        return {
          id: item.id,
          name: item.name,
        };
      }),
      album: {
        id: item.al.id,
        name: item.al.name,
      },
      duration: item.dt,
    });
  });

  // 随机歌词
  const randomMusicId =
    likeList.value[Math.floor(Math.random() * likeList.value.length)].id;
  const lrcRes: any = await getLyricApi({ id: randomMusicId });
  const lyric = lrcRes.lrc.lyric
    .split("\n")
    .filter((item: string) => item)
    .map((item: string) => item.split("]")[1])
    .filter((item: string) => item);
  // 随机的连续3个元素
  const randomIndex = Math.floor(Math.random() * (lyric.length - 1));
  randomLyric.value = lyric.slice(randomIndex, randomIndex + 3).join("\n");
};

const getLikeList = async () => {
  const res: any = await getLikeListApi({
    uid: user.value.userId,
  });
  likeCount.value = res.ids.length;
};

const getArtistSubList = async () => {
  const { data, hasMore } = await getArtistSubListApi({
    offset: artistSubList.value.length,
  });
  data.forEach((item: any) => {
    artistSubList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.img1v1Url,
    });
  });
  if (hasMore) {
    getArtistSubList();
  }
};

const getAlbumSubList = async () => {
  const { data, hasMore } = await getAlbumSubListApi({
    offset: albumSubList.value.length,
  });

  data.forEach((item: any) => {
    albumSubList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
      artists: item.artists.map((item: any) => {
        return {
          id: item.id,
          name: item.name,
        };
      }),
    });
  });
  if (hasMore) {
    getAlbumSubList();
  }
};

const getMvSubList = async () => {
  const { data, hasMore } = await getMvSubListApi({
    offset: mvSubList.value.length,
  });
  data.forEach((item: any) => {
    mvSubList.value.push({
      id: item.vid,
      name: item.title,
      picUrl: item.coverUrl,
      creators: item.creator.map((item: any) => {
        return {
          id: item.userId,
          name: item.userName,
        };
      }),
    });
  });
  if (hasMore) {
    getMvSubList();
  }
};

const getListenHistory = async (type: 1 | 0) => {
  const { weekData, allData } = await getListenHistoryApi({
    uid: user.value.userId,
    type,
  });
  if (type === 1) {
    musicHistoryData.value = weekData.map(({ song }: any) => {
      return {
        id: song.id,
        name: song.name,
        picUrl: song.al.picUrl,
        singers: song.ar.map((item: any) => {
          return {
            id: item.id,
            name: item.name,
          };
        }),
        album: {
          id: song.al.id,
          name: song.al.name,
        },
        duration: dayjs(song.dt).format("mm:ss"),
      };
    });
  }
};

const handleClickTab = (id: string) => {
  if (id === activeTab.value) return;
  activeTab.value = id;
  tabs.forEach((item) => {
    if (item.id === id) {
      item.do();
    }
  });
};

onBeforeMount(() => {
  init();
});

onMounted(async () => {
  await getPlayListByUid();
  await getLikeList();
  isLoaded.value = true;
  console.log("Me组件onMounted");
});
</script>

<style lang="scss" scoped>
.btn-play {
  transition: all 300ms;
  background-color: rgb(51, 94, 234);

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

.like-card {
  display: flex;
  padding: 1rem;
  flex-direction: column;
  border-radius: 0.75rem;
  background-color: rgba(51, 94, 234, 0.2);
  color: rgb(51, 94, 234);
}

.like-music {
  padding: 0 8px;

  &:hover {
    background-color: rgba(218, 220, 228, 0.4);
  }
}

.active-tab {
  transition: all 300ms;
  color: rgb(51, 94, 234);
  border-color: rgb(51, 94, 234);
}
</style>
