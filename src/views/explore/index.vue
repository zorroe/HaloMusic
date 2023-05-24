<template>
  <div>
    <div class="text-6xl font-bold mb-4 bg-white">发现</div>
    <div class="flex flex-wrap bg-white">
      <div v-for="btn in btns" :key="btn.name">
        <ea-button class="show-btn m-4" v-if="btn.enable" @click="handleClick(btn)"
          :type="activeName == btn.name ? 'primary' : 'info'">
          <div class="text-lg font-bold">{{ btn.name }}</div>
        </ea-button>
      </div>
      <ea-button class="m-4" @click="showHidden = !showHidden" type="info">
        <div class="text-lg font-bold">...</div>
      </ea-button>
    </div>
    <Transition name="expand">
      <div class="flex flex-col gap-4 my-4 px-4 rounded-lg bg-gray-100 p-8 mx-4" v-show="showHidden">
        <div class="flex items-center" v-for="cat in cats" :key="cat">
          <div class="min-w-fit mr-6">
            <div class="text-lg font-bold">{{ cat }}</div>
          </div>
          <div class="flex flex-wrap gap-4">
            <div v-for="label in labels(cat)" :key="label.name" @click="handleVisible(label)">
              <div class="cat-item-hidden" :class="{ 'cat-item-active': label.enable }">
                {{ label.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <div class="grid-cols-5 grid place-items-center gap-8 mx-16 mt-12">
      <play-list-cover v-for="item in playListList" :key="item.id" :data="item"></play-list-cover>
    </div>
    <div class="flex justify-center items-center my-4" v-show="showMoreBtn">
      <ea-button @click="loadMore" type="info">
        <div class="text-lg font-bold">加载更多</div>
      </ea-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { playlistCategories } from "./btns";
import { useLocalStorage } from "@vueuse/core";
import { PlayListBaseInfo } from "@/types/playListRel";
import { getHighQualityPlayList, getTopListApi, getrecommendPlayListApi, getTopPlayList } from "@/api/playList";

const btns = ref(useLocalStorage("btns", playlistCategories));
const cats = ["语种", "风格", "场景", "情感", "主题"];
const showHidden = ref(false);
const playListList = ref<PlayListBaseInfo[]>([]);
const showMoreBtn = ref(false);
const activeName = ref("全部");

const params = {
  offset: 0,
  limit: 60,
  before: 0,
}

const topParams = {
  offset: 0,
  limit: 60,
  cat: "全部",
}

const labels = (cat: string) => {
  return btns.value.filter((item: any) => item.bigCat === cat);
};

// 点击推荐歌单
const handleClickPersonized = async () => {
  playListList.value = [];
  showMoreBtn.value = false;
  params.offset = 0;
  const { result } = await getrecommendPlayListApi({ limit: 100 });
  playListList.value = parse2PlayListBaseInfoList(result);
}

// 点击排行榜
const handleClickTopList = async () => {
  playListList.value = [];
  showMoreBtn.value = false;
  params.offset = 0;
  const { list } = await getTopListApi();
  list.forEach((item: any) => {
    playListList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.coverImgUrl,
      playCount: item.playCount,
    });
  });
}

// 点击精品歌单
const handleClickHighQuality = async (params: any) => {
  const { playlists } = await getHighQualityPlayList(params)
  // 获取playlists最后一个元素的updateTime字段
  params.before = playlists[playlists.length - 1].updateTime;
  playListList.value.push(...parse2PlayListBaseInfoList(playlists))
  showMoreBtn.value = true;
}

// 点击其他
const handleOthers = async (params: any) => {
  const { playlists } = await getTopPlayList(params);
  playListList.value.push(...parse2PlayListBaseInfoList(playlists))
  showMoreBtn.value = true;
}

const handleClick = async (btn: any) => {
  if (btn.name === activeName.value) return;
  activeName.value = btn.name;
  if (btn.name === "推荐歌单") {
    handleClickPersonized()
  } else if (btn.name === "排行榜") {
    handleClickTopList()
  } else if (btn.name === "精品歌单") {
    playListList.value = [];
    handleClickHighQuality(params)
  } else {
    playListList.value = [];
    topParams.cat = btn.name;
    handleOthers(topParams);
  }
};

const handleVisible = (btn: any) => {
  btns.value.forEach((item: any) => {
    if (item.name === btn.name) {
      item.enable = !item.enable;
    }
  });
};

const loadMore = () => {
  if (activeName.value === "精品歌单") {
    handleClickHighQuality(params)
  } else {
    topParams.offset += 60;
    handleOthers(topParams);
  }
};

const parse2PlayListBaseInfoList = (list: any[]) => {
  return list.map((item: any) => {
    return {
      id: item.id,
      name: item.name,
      picUrl: item.picUrl || item.coverImgUrl,
      playCount: item.playCount,
    };
  });
};

onMounted(() => {
  handleOthers(topParams);
});
</script>

<style lang="scss" scoped>
.cat-item-hidden {
  @apply rounded-md px-4 py-1 cursor-pointer;

  &:hover {
    color: rgb(51, 94, 234);
    background-color: rgb(234, 239, 253);
  }
}

.cat-item-active {
  color: rgb(51, 94, 234);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.5s ease-in-out;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
}
</style>