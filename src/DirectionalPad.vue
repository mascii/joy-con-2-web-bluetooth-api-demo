<script setup lang="ts">
const props = defineProps<{
  up: boolean | number;
  down: boolean | number;
  left: boolean | number;
  right: boolean | number;
}>();
</script>

<template>
  <svg width="175" height="175" viewBox="10 10 180 180" class="svg">
    <!-- up -->
    <circle cx="100" cy="50" r="20" :class="{ pressed: props.up }" />
    <!-- down -->
    <circle cx="100" cy="150" r="20" :class="{ pressed: props.down }" />
    <!-- left -->
    <circle cx="50" cy="100" r="20" :class="{ pressed: props.left }" />
    <!-- right -->
    <circle cx="150" cy="100" r="20" :class="{ pressed: props.right }" />
  </svg>
</template>

<style scoped>
.svg circle {
  fill: #666;
}
.svg circle.pressed {
  fill: #fff;
}
</style>
