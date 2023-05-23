<template>
  <div>
    <div class="text-6xl font-bold mb-4 bg-white">发现</div>
    <div class="flex flex-wrap bg-white">
      <div v-for="btn in btns" :key="btn.name">
        <ea-button class="show-btn mx-2" v-if="btn.enable" @click="handleClick(btn)" :type="activeName == btn.name ? 'primary' : 'info'">
          <div class="text-lg font-bold">{{ btn.name }}</div>
        </ea-button>
      </div>
      <ea-button class="mx-2" @click="showHidden = !showHidden" type="info">
        <div class="text-lg font-bold">...</div>
      </ea-button>
    </div>
    <Transition name="expand">
      <div class="flex flex-col gap-4 my-4 px-4" v-show="showHidden">
        <div class="flex" v-for="cat in cats" :key="cat">
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
    <div class="grid-cols-5 grid place-items-center gap-4">
      <play-list-cover v-for="item in playListList" :key="item.id" :data="item"></play-list-cover>
    </div>
    <div class="flex justify-center items-center" v-show="showMoreBtn">
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

const btns = ref(useLocalStorage("btns", playlistCategories));
const cats = ["语种", "风格", "场景", "情感", "主题"];

const labels = (cat: string) => {
  return btns.value.filter((item: any) => item.bigCat === cat);
};

const showHidden = ref(false);
const playListList = ref<PlayListBaseInfo[]>([]);
const showMoreBtn = ref(false);
const activeName = ref("全部");

const handleClick = (btn: any) => {
  activeName.value = btn.name;
};

const handleVisible = (btn: any) => {
  btns.value.forEach((item: any) => {
    if (item.name === btn.name) {
      item.enable = !item.enable;
    }
  });
};

const loadMore = () => {
  console.log("loadMore");
};

onMounted(() => {
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