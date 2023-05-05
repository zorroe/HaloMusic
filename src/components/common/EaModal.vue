<template>
  <input type="checkbox" :id="props.id" class="modal-toggle" />
  <div class="modal absolute pos-center">
    <div class="modal-box">
      <h3 class="font-bold text-lg">{{ props.msg }}</h3>
      <div class="modal-action gap-2">
        <ea-button
          :for="props.id"
          :type="props.buttonType"
          class="font-bold"
          @click="handleConfirm"
          >确定</ea-button
        >
        <ea-button :for="props.id" type="info" class="font-bold"
          >取消</ea-button
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  msg: {
    type: String,
    default: "确定删除吗？",
  },
  buttonType: {
    type: String,
    default: "danger",
  },
});

const emit = defineEmits(["confirm"]);

const handleConfirm = () => {
  emit("confirm");
};
</script>

<style lang="scss" scoped>
.modal {
  z-index: 9200;
}

.pos-center {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%); //与方法二不同处
}
</style>
