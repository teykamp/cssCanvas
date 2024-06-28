<template>
  <div>
    <canvas ref="canvas" :width="width" :height="height"></canvas>
    <div ref="slotContainer" style="display: none">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, defineProps } from 'vue'

const props = defineProps<{
  width?: number
  height?: number
}>()

const width = props.width ?? 800
const height = props.height ?? 600

const slotContainer = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

const getCssProperties = (element: Element) => {
  const styles = window.getComputedStyle(element)
  return {
    type: element.getAttribute('data-shape'),
    left: parseInt(styles.left) || 0,
    top: parseInt(styles.top) || 0,
    width: parseInt(styles.width) || 50,
    height: parseInt(styles.height) || 50,
    backgroundColor: styles.backgroundColor || '#000',
    borderRadius: parseInt(styles.borderRadius) || 0
  }
}

const drawShapes = () => {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  if (!slotContainer.value) return
  const shapes = Array.from(slotContainer.value.children).map(getCssProperties)

  shapes.forEach(shape => {
    ctx.fillStyle = shape.backgroundColor
    if (shape.type === 'circle' || shape.borderRadius > 0) {
      const radius = shape.width / 2
      ctx.beginPath()
      ctx.arc(shape.left + radius, shape.top + radius, radius, 0, 2 * Math.PI)
      ctx.fill()
    } else {
      ctx.fillRect(shape.left, shape.top, shape.width, shape.height)
    }
  })
}

onMounted(() => {
  drawShapes()
})
</script>

<style>
/* Add any necessary styles */
</style>
