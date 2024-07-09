<template>
  <div>
    <CssCanvas>
      <div style="display: flex;">
        <div style="left: 50px; top: 50px; width: 100px; height: 100px; background-color: red; position: absolute;">
          <div style="width: 10px; height: 10px; background-color: aqua; left: 500px; top: 50px; position: absolute;">
          </div>
        </div>
        <div class="draggable" @mousedown="onMouseDown" ref="draggableDiv"
          style="left: 790px; top: 200px; width: 500px; height: 500px; background-color: lightcoral; border-radius: 50%; cursor: pointer; position: absolute; border: 25px solid red; background-image: linear-gradient(purple, white)">
        </div>
        <button :style="style" @click="style.backgroundColor = 'green'">hi</button>
      </div>
    </CssCanvas>
  </div>
</template>

<script setup lang="ts">
import CssCanvas from '@/components/CssCanvas.vue'
import { ref, onMounted, onUnmounted } from 'vue'

const style = ref({
  backgroundColor: 'red',
  width: '50px',
  height: '100px',
})

const draggableDiv = ref<HTMLElement | null>(null)
let isDragging = false
let offsetX = 0
let offsetY = 0

const onMouseDown = (event: MouseEvent) => {
  isDragging = true
  offsetX = event.clientX - (draggableDiv.value?.offsetLeft ?? 0)
  offsetY = event.clientY - (draggableDiv.value?.offsetTop ?? 0)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (event: MouseEvent) => {
  if (isDragging && draggableDiv.value) {
    const x = event.clientX - offsetX
    const y = event.clientY - offsetY
    draggableDiv.value.style.left = `${x}px`
    draggableDiv.value.style.top = `${y}px`
  }
}

const onMouseUp = () => {
  isDragging = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

onMounted(() => {
  if (draggableDiv.value) {
    draggableDiv.value.style.position = 'absolute'
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped>
.draggable {
  cursor: move;
}
</style>
