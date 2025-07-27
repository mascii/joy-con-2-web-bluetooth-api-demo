<script lang="ts" setup>
const props = defineProps<{
  color: string;
  x: number;
  y: number;
  scale: number;
}>();
</script>

<template>
  <div
    class="crosshair"
    :style="{
      left: props.x / props.scale + 'px',
      top: props.y / props.scale + 'px',
    }"
  >
    <div
      class="line vertical"
      :style="{
        left: 0,
        top: -props.y / props.scale + 'px',
        backgroundColor: color,
      }"
    ></div>
    <div
      class="line horizontal"
      :style="{
        top: 0,
        left: -props.x / props.scale + 'px',
        backgroundColor: color,
      }"
    ></div>
  </div>
</template>

<style scoped>
.crosshair {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
}
.line {
  position: absolute;
}
.vertical {
  width: 1px;
  height: 100vh;
  top: 0;
}
.horizontal {
  width: 100vw;
  height: 1px;
  left: 0;
}
.content {
  padding: 20px;
  text-align: center;
  margin-top: 50px;
}
</style>
