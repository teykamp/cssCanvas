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

interface Shape {
  type: string
  left: number
  top: number
  width: number
  height: number
  backgroundColor: string
  draggable: boolean
  children: Shape[]
}

const props = defineProps<{
  width?: number
  height?: number
}>()

const width = props.width ?? 800
const height = props.height ?? 600

const slotContainer = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
let shapes = ref<Shape[]>([])
let dragging = ref(false)
let currentShape: Shape | null = null
let offsetX = ref(0)
let offsetY = ref(0)

const inferShapeType = (styles: CSSStyleDeclaration): string => {
  if (parseInt(styles.borderRadius) > 0 || styles.borderRadius === '50%') {
    return 'circle'
  }
  return 'rectangle'
}

const getCssProperties = (element: Element): Shape => {
  const styles = window.getComputedStyle(element)
  const type = inferShapeType(styles)
  return {
    type,
    left: parseInt(styles.left) || 0,
    top: parseInt(styles.top) || 0,
    width: parseInt(styles.width) || 50,
    height: parseInt(styles.height) || 50,
    backgroundColor: styles.backgroundColor || '#000',
    draggable: element.classList.contains('draggable'),
    children: []
  }
}

const extractShapes = (element: Element): Shape => {
  const shape = getCssProperties(element)
  Array.from(element.children).forEach(child => {
    shape.children.push(extractShapes(child))
  })
  return shape
}

const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
  ctx.fillStyle = shape.backgroundColor
  if (shape.type === 'circle') {
    const radius = shape.width / 2
    ctx.beginPath()
    ctx.arc(shape.left + radius, shape.top + radius, radius, 0, 2 * Math.PI)
    ctx.fill()
  } else {
    ctx.fillRect(shape.left, shape.top, shape.width, shape.height)
  }
  shape.children.forEach(child => {
    drawShape(ctx, { ...child, left: shape.left + child.left, top: shape.top + child.top })
  })
}

const drawShapes = () => {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  shapes.value.forEach(shape => drawShape(ctx, shape))
}

const isMouseOverShape = (x: number, y: number, shape: Shape) => {
  if (shape.type === 'circle') {
    const radius = shape.width / 2
    const centerX = shape.left + radius
    const centerY = shape.top + radius
    return (x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2
  } else {
    return x >= shape.left && x <= shape.left + shape.width && y >= shape.top && y <= shape.top + shape.height
  }
}

const findShapeAtPosition = (x: number, y: number, shapes: Shape[]): Shape | null => {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i]
    if (isMouseOverShape(x, y, shape)) {
      return shape
    }
    const childShape = findShapeAtPosition(x - shape.left, y - shape.top, shape.children)
    if (childShape) {
      return childShape
    }
  }
  return null
}

const handleMouseDown = (event: MouseEvent) => {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  currentShape = findShapeAtPosition(x, y, shapes.value)
  if (currentShape?.draggable) {
    dragging.value = true
    offsetX.value = x - currentShape.left
    offsetY.value = y - currentShape.top
  }
}

const moveShape = (shape: Shape, dx: number = 0, dy: number = 0) => {
  shape.left += dx
  shape.top += dy
  shape.children.forEach(child => moveShape(child))
}

const handleMouseMove = (event: MouseEvent) => {
  if (!dragging.value || !currentShape) return
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const dx = x - offsetX.value - currentShape.left
  const dy = y - offsetY.value - currentShape.top

  moveShape(currentShape, dx, dy)
  drawShapes()
}

const handleMouseUp = () => {
  dragging.value = false
  currentShape = null
}

onMounted(() => {
  if (!slotContainer.value) return
  shapes.value = Array.from(slotContainer.value.children).map(extractShapes)
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
