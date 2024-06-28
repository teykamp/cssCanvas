<template>
  <div>
    <canvas ref="canvas" :width="width" :height="height"></canvas>
    <div ref="slotContainer" style="display: none">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineProps } from 'vue'

const props = defineProps<{
  width?: number
  height?: number
}>()

const width = props.width ?? 800
const height = props.height ?? 600

const slotContainer = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
let shapes = ref<any[]>([])
let dragging = ref(false)
let currentShapeIndex = ref<number | null>(null)
let offsetX = ref(0)
let offsetY = ref(0)

const getCssProperties = (element: Element) => {
  const styles = window.getComputedStyle(element)
  return {
    type: element.getAttribute('data-shape'),
    left: parseInt(styles.left) || 0,
    top: parseInt(styles.top) || 0,
    width: parseInt(styles.width) || 50,
    height: parseInt(styles.height) || 50,
    backgroundColor: styles.backgroundColor || '#000',
    borderRadius: parseInt(styles.borderRadius) || 0,
    draggable: element.classList.contains('draggable')
  }
}

const drawShapes = () => {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  shapes.value.forEach(shape => {
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

const isMouseOverShape = (x: number, y: number, shape: any) => {
  if (shape.type === 'circle' || shape.borderRadius > 0) {
    const radius = shape.width / 2
    const centerX = shape.left + radius
    const centerY = shape.top + radius
    return (x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2
  } else {
    return x >= shape.left && x <= shape.left + shape.width && y >= shape.top && y <= shape.top + shape.height
  }
}

const handleMouseDown = (event: MouseEvent) => {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  for (let i = 0; i < shapes.value.length; i++) {
    if (shapes.value[i].draggable && isMouseOverShape(x, y, shapes.value[i])) {
      dragging.value = true
      currentShapeIndex.value = i
      offsetX.value = x - shapes.value[i].left
      offsetY.value = y - shapes.value[i].top
      return
    }
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!dragging.value) return
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  if (currentShapeIndex.value !== null) {
    shapes.value[currentShapeIndex.value].left = x - offsetX.value
    shapes.value[currentShapeIndex.value].top = y - offsetY.value
    drawShapes()
  }
}

const handleMouseUp = () => {
  dragging.value = false
  currentShapeIndex.value = null
}

onMounted(() => {
  if (!slotContainer.value) return
  shapes.value = Array.from(slotContainer.value.children).map(getCssProperties)
  drawShapes()

  if (canvas.value) {
    canvas.value.addEventListener('mousedown', handleMouseDown)
    canvas.value.addEventListener('mousemove', handleMouseMove)
    canvas.value.addEventListener('mouseup', handleMouseUp)
  }
})

onUnmounted(() => {
  if (canvas.value) {
    canvas.value.removeEventListener('mousedown', handleMouseDown)
    canvas.value.removeEventListener('mousemove', handleMouseMove)
    canvas.value.removeEventListener('mouseup', handleMouseUp)
  }
})
</script>

<style>
/* Add any necessary styles */
</style>
