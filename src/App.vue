<template>
  <div>
    <CssCanvas :width="width" :height="height">
      <div style="left: 50px; top: 50px; width: 100px; height: 100px; background-color: red;" class="draggable">
        <div style="width: 10px; height: 10px; background-color: aqua; left: 500px; top: 50px;"></div>
      </div>
      <div style="left: 200px; top: 200px; width: 100px; height: 100px; background-color: blue; border-radius: 50%;">
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
