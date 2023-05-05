<template>
  <label class="ea-button" :class="[props.type, props.size]">
    <slot></slot>
  </label>
</template>

<script setup lang="ts">
interface Props {
  type: "primary" | "danger" | "info";
  size: "small" | "normal" | "large";
}

const props = withDefaults(defineProps<Props>(), {
  type: "primary",
  size: "normal",
});
</script>

<style lang="scss" scoped>
.ea-button {
  @apply flex items-center justify-center py-1 px-2 rounded-md gap-1 cursor-pointer w-fit transition-all duration-300 hover:scale-105 active:scale-95;
}

/* 按钮类型 */
.primary {
  background-color: rgb(234, 239, 253);
  color: rgb(51, 94, 234);
}

.danger {
  background-color: rgb(253, 236, 234);
  color: #f56c6c;
}

.info {
  background-color: rgb(227, 228, 228);
  color: rgb(125, 126, 133);
}

/* 按钮大小 */
.small {
  min-width: 80px;
  height: 32px;
  font-size: 14px;
}

.normal {
  min-width: 100px;
  height: 40px;
  font-size: 16px;
}

.large {
  min-width: 120px;
  height: 48px;
  font-size: 18px;
}
</style>
