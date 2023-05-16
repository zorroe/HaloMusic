<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="props.drawerShow" id="ea-drawer-shadow" class="ea-drawer-body">
        <div class="ea-drawer-content" id="ea-drawer-content">
          <div v-if="props.title" class="ea-drawer-content-header">
            <span class="ea-drawer-content-header-title">
              {{ props.title }}
            </span>
            <div class="ea-drawer-content-header-close" v-show="props.iconClose || !props.shadowClose" @click="emit('close')">关</div>
          </div>
          <div class="ea-drawer-content-main">
            <slot></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from "vue";

const props = defineProps({
  drawerShow: {
    type: Boolean,
    default: false,
  },
  shadowClose: {
    type: Boolean,
    default: true,
  },
  iconClose: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close"]);

const clickEvent = (e: Event) => {
  if (!props.shadowClose) return;
  const target = e.target as HTMLElement;
  if (target.id === "ea-drawer-shadow") {
    emit("close");
  }
};

watch(
  () => props.drawerShow,
  () => {
    if (props.drawerShow) {
      document.addEventListener("click", clickEvent);
    } else {
      document.removeEventListener("click", clickEvent);
    }
  }
);
</script>

<style lang="scss" scoped>

.ea-drawer-content {
  position: fixed;
  width: 30%;
  max-width: 30%;
  right: 0px;
  top: 66px;
  bottom: 66px;
  overflow: auto;
  overflow-x: hidden;
  border-radius: 8px;
  padding: 12px;
  background-color: rgba(255,255,255,0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &-header{
    font-size: 32px;
    font-weight: 800;
    display: flex;

    &-title{
      width: 80%;
      text-align: start;
    }

    &-close{
      width: 20%;
      text-align: center;
      cursor: pointer;
      border: 1px black solid;
    }
  }

  &-main{
    flex-grow: 1;
  }
}

.ea-drawer-body {
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0px;
  right: 0px;
  display: flex;
  background: radial-gradient(transparent, rgba(0,0,0,0.1) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(10px);
  z-index: 9998;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: all 500ms ease-in-out;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-active .ea-drawer-content,
.drawer-leave-active .ea-drawer-content {
  transition: all 500ms ease-in-out;
}

.drawer-enter-from .ea-drawer-content,
.drawer-leave-to .ea-drawer-content {
  transform: translateX(100%);
}
</style>
