<template>
  <div>
    <canvas ref="canvas" :width="width" :height="height" style="position: absolute; top: 0; left: 0"></canvas>
    <div ref="slotContainer" style="opacity: 0; position: absolute; top: 0; left: 0">
      <slot></slot>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const slotContainer = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

const width = 800
const height = 600

interface ElementInfo {
  rect: DOMRect
  styles: CSSStyleDeclaration
  children: ElementInfo[]
}

const getElementInfo = (element: Element): ElementInfo => {
  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const children = Array.from(element.children).map(getElementInfo)
  return { rect, styles, children }
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

const drawElement = (ctx: CanvasRenderingContext2D, elementInfo: ElementInfo) => {
  const { rect, styles, children } = elementInfo

  const backgroundColor = styles.backgroundColor
  const borderColor = styles.borderColor
  const borderWidth = parseFloat(styles.borderWidth)
  const borderRadius = parseFloat(styles.borderRadius)

  ctx.fillStyle = backgroundColor

  if (borderRadius * 2 >= Math.min(rect.width, rect.height)) {
    const radius = Math.min(rect.width, rect.height) / 2
    ctx.beginPath()
    ctx.arc(rect.left + radius, rect.top + radius, radius, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()

    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor
      ctx.lineWidth = borderWidth
      ctx.stroke()
    }
  } else {
    drawRoundedRect(ctx, rect.left, rect.top, rect.width, rect.height, borderRadius)
    ctx.fill()

    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor
      ctx.lineWidth = borderWidth
      ctx.stroke()
    }
  }

  children.forEach((child) => drawElement(ctx, child))
}

const drawOnCanvas = () => {
  if (!canvas.value || !slotContainer.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  const elements = Array.from(slotContainer.value.children).map(getElementInfo)

  elements.forEach((element) => drawElement(ctx, element))
}

onMounted(async () => {
  await nextTick() // Wait for the next DOM update cycle to ensure slot elements are rendered
  drawOnCanvas()
})
</script>

<style scoped>
/* Add any necessary styling here */
</style>
