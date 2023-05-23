<template>
  <div class="text-6xl font-bold mb-4 bg-white">发现</div>
  <div class="flex flex-wrap bg-white">
    <div v-for="btn in btns">
      <ea-button v-if="btn.enable" class="mx-2">
        <div class="text-lg font-bold">{{ btn.name }}</div>
      </ea-button>
    </div>
    <ea-button class="mx-2" @click="showHidden = !showHidden">
        <div class="text-lg font-bold">...</div>
    </ea-button>
  </div>
  <Transition name="expand">
    <div class="flex flex-col gap-4 my-4 px-4" v-show="showHidden">
    <div class="flex" v-for="cat in cats">
      <div class="min-w-fit mr-6">
        <div class="text-lg font-bold">{{ cat }}</div>
      </div>
      <div class="flex flex-wrap gap-4">
        <div v-for="label in labels(cat)" @click="handleVisible(label)">
          <div class="cat-item-hidden" :class="{'cat-item-active':label.enable}">
            {{ label.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import { playListTagsApi } from "@/api/playList";
import { onMounted, ref } from "vue";
import { playlistCategories } from "./btns";
import { useLocalStorage } from "@vueuse/core";

const btns = ref(useLocalStorage("btns", playlistCategories))
const cats = ["语种","风格","场景","情感","主题"]

const labels = (cat:string)=>{
  return btns.value.filter((item:any)=>item.bigCat === cat)
}

defineOptions({
  name: "explore",
});

const showHidden = ref(false)

const getPlayListTags = async () => {
  const res = await playListTagsApi();
  console.log(res);
};

const handleVisible = (btn:any)=>{
  btns.value.forEach((item:any)=>{
    if(item.name === btn.name){
      item.enable = !item.enable;
    }
  })
}



onMounted(() => {
  getPlayListTags();
});
</script>

<style lang="scss" scoped>

.cat-item-hidden{
  @apply rounded-md px-4 py-1 cursor-pointer;
  
  &:hover{
    color: rgb(51, 94, 234);
    background-color: rgb(234, 239, 253);
  }
}

.cat-item-active{
  color: rgb(51, 94, 234);
  background-color: rgb(234, 239, 253);
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
