<template>
  <input type="checkbox" :id="props.id" class="modal-toggle" />
  <label :for="props.id" class="modal">
    <label class="modal-box relative" for="">
      <div>
        <slot></slot>
      </div>
      <div class="modal-action gap-2" v-if="props.showBtn">
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
    </label>
  </label>
</template>

<script setup lang="ts">

interface Props {
  id: string;
  buttonType: string;
  showBtn: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  buttonType: "danger",
  showBtn: true
});

const emit = defineEmits(["confirm"]);

const handleConfirm = () => {
  emit("confirm");
};
</script>

<style lang="scss" scoped>
.modal {
  z-index: 9300;
}
</style>
