<template>
  <div>
    <CssCanvas>
      <div style="display: flex;">
        <div style="left: 50px; top: 50px; width: 100px; height: 100px; background-color: red;" class="draggable">
          <div style="width: 10px; height: 10px; background-color: aqua; left: 500px; top: 50px; position: absolute;">
          </div>
        </div>
        <div
          style="left: 790px; top: 200px; width: 100px; height: 100px; background-color: blue; border-radius: 50%; cursor: pointer; position: absolute;  border: 5px dotted red;">
        </div>
        <button :style="style" @click="style.backgroundColor = 'green'">hi</button>
      </div>
    </CssCanvas>
  </div>
</template>

<script setup lang="ts">
import CssCanvas from '@/components/CssCanvas.vue'
import { ref } from 'vue'

const style = ref({
  backgroundColor: 'red'
})


</script>

<style scoped>

</style>
