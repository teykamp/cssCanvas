<template>
  <div>
    <CssCanvas>
      <div style="display: flex;">
        <!-- <div style="left: 50px; top: 50px; width: 100px; height: 100px; background-color: red; position: absolute;">
          <div style="width: 10px; height: 10px; background-color: aqua; left: 500px; top: 50px; position: absolute;">
          </div>
        </div> -->
        <div
          style="left: 790px; top: 200px; width: 500px; height: 500px; background-color: lightcoral; border-radius: 50%; cursor: pointer; position: absolute; border: 25px dashed red; font-size: xx-large;">
          THISASDFGHJKL
        </div>
        <!-- <button :style="style" @click="style.backgroundColor = style.backgroundColor === 'red' ? 'blue' : 'red'">hi</button> -->
      </div>
    </CssCanvas>
  </div>
</template>

<script setup lang="ts">
import CssCanvas from '@/components/CssCanvas.vue'
import { ref } from 'vue'

const style = ref({
  backgroundColor: 'red',
  width: '50px',
  height: '100px',
})

</script>

<style>
.slidecontainer {
  width: 100%;
}

.slider {
  -webkit-appearance: none;
  width: 100%;
  height: 25px;
  background: #d3d3d3;
  outline: none;
  opacity: 0.7;
  -webkit-transition: .2s;
  transition: opacity .2s;
}

.slider:hover {
  opacity: 1;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 25px;
  height: 25px;
  background: #04AA6D;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 25px;
  height: 25px;
  background: #04AA6D;
  cursor: pointer;
}
</style>
