<template>
  <div>
    <CssCanvas :width="width" :height="height">
      <div data-shape="rect"
        style="left: 50px; top: 50px; width: 100px; height: 100px; background-color: red;"></div>
      <div data-shape="circle"
        style="left: 200px; top: 200px; width: 100px; height: 100px; background-color: blue; border-radius: 50%;">
      </div>
    </CssCanvas>
  </div>
</template>

<script setup lang="ts">
import CssCanvas from '@/components/CssCanvas.vue'

const { width, height } = {
  width: window.innerWidth - 20,
  height: window.innerHeight - 20
}

</script>

<style scoped>

</style>
