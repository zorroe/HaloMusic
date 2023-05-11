<template>
  <div
    :class="[
      'ea-notify',
      { 'ea-notify-visible': visible, 'ea-notify-invisible': !visible },
    ]"
    class="flex flex-colitems-center"
    ref="notifyRef"
    @mouseenter="clearTimer"
    @mouseleave="startTimer"
  >
    <div class="ea-notify-body">
      <component :is="iconCom.component" :fill="iconCom.color" :size="24"/>
      <div class="ea-notify-content">
        {{ props.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Info, CheckOne,Attention,CloseOne } from "@icon-park/vue-next";
import { Icon } from "@icon-park/vue-next/lib/runtime";
const visible = ref(true);
const notifyRef = ref();

const props = defineProps({
  message: {
    type: String,
    default: "",
  },
  duration: {
    type: Number,
    default: 3000,
  },
  type:{
    type: String,
    default: "info",
  }
});

var timer: any;

interface IconMap {
  [key: string]: {
    component: Icon;
    color: string;
  };
}

const iconMap: IconMap = {
  info: { component: Info, color: "#1890ff" },
  success: { component: CheckOne, color: "#52c41a" },
  warning: { component: Attention, color: "#faad14" },
  error: { component: CloseOne, color: "#f5222d" },
};

const iconCom = computed(() => {
  const { component = Info, color = "#1890ff" } = iconMap[props.type] || {};
  return { component, color };
});

function startTimer() {
  if (props.duration > 0) {
    timer = setTimeout(() => {
      if (visible.value) {
        close();
      }
    }, props.duration);
  }
}

function clearTimer() {
  clearTimeout(timer);
}

function close() {
  console.log("close");
  visible.value = false;
}

onMounted(() => {
  startTimer();
});
</script>

<style lang="scss" scoped>
.ea-notify {
  width: 256px;
  transition: all 500ms;
  background-color: rgb(255, 255, 255);
  box-shadow: rgb(0 0 0 / 10%) 0px 0px 16px 0px;
  animation: fade-in 200ms ease-in-out;
  padding: 0px 16px;
  font-weight: 700;

  @keyframes fade-in {
    0% {
      transform: translateX(300px);
    }
  }

  &-visible {
    height: 64px;
    margin-top: 16px;
    border-radius: 10px;
    opacity: 1;
  }

  &-invisible {
    height: 0px;
    margin: 0px;
    opacity: 0;
  }

  .ea-notify-title {
    font-size: 20px;
    font-weight: bolder;
  }

  .ea-notify-body {
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
  }
}
</style>
