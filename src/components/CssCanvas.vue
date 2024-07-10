<template>
  <div>
    <canvas ref="canvas" :width="width" :height="height" style="position: absolute; top: 0; left: 0"></canvas>
    <div ref="slotContainer" style="opacity: 0; position: absolute; top: 0; left: 0">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'

const slotContainer = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const { width, height } = {
  width: window.innerWidth - 20,
  height: window.innerHeight - 20
}

const asciiize = (ctx: CanvasRenderingContext2D, cellSize: number) => {
  const convertToAscii = (brightness: number) => {
    if (brightness > 220) return '█'
    if (brightness > 160) return '▓'
    if (brightness > 120) return '#'
    if (brightness > 100) return 'X'
    if (brightness > 80) return '▒'
    if (brightness > 60) return 'C'
    if (brightness > 40) return '░'
    return ' '
  }
  const convertToEmoji = (brightness: number) => {
    if (brightness > 220) return '😊'
    if (brightness > 160) return '😎'
    if (brightness > 120) return '👀'
    if (brightness > 100) return '🎶'
    if (brightness > 80) return '❤'
    if (brightness > 60) return '👌'
    if (brightness > 40) return '✔'
    return ' '
  }

  const pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const imageCellArray = []
  for (let y = 0; y < pixels.height; y += cellSize) {
    for (let x = 0; x < pixels.width; x += cellSize) {
      const pixelPosition = 4 * (pixels.width * y + x)
      if (pixels.data[pixelPosition + 3] > 50) {
        const [red, green, blue] = [pixels.data[pixelPosition], pixels.data[pixelPosition + 1], pixels.data[pixelPosition + 2]]
        const brightness = (red + green + blue) / 3
        const symbol = convertToAscii(brightness)
        const color = `rgb(${red}, ${green}, ${blue})`
        imageCellArray.push({ x, y, symbol, color })
        ctx.font = cellSize + 'px monospace'
        ctx.fillStyle = 'rgba(200, 200, 200, 0.1)'
        ctx.fillText(symbol, x + 1, y + 1)
        ctx.fillStyle = color
        ctx.fillText(symbol, x, y)
      }
    }
  }
}

const renderHtmlToCanvas = (
  canvas: HTMLCanvasElement,
  html: string,
  imageEffect: (ctx: CanvasRenderingContext2D, ...args: any[]) => void,
  effectArgs: any[]
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>
  `

  const encodedSvg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}` // avoid cors

  const htmlImage = new Image()
  htmlImage.addEventListener('load', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(htmlImage, 0, 0)

    // imageEffect(ctx, ...effectArgs)
  })

  htmlImage.src = encodedSvg
}

const updateCanvas = () => {
  if (slotContainer.value && canvas.value) {
    const html = slotContainer.value.innerHTML
    renderHtmlToCanvas(canvas.value, html, asciiize, [10])
  }
}

onMounted(async () => {
  await nextTick()
  updateCanvas()

  slotContainer.value?.addEventListener('mouseenter', updateCanvas)
  slotContainer.value?.addEventListener('mouseleave', updateCanvas)
  slotContainer.value?.addEventListener('click', updateCanvas)
})

onBeforeUnmount(() => {
  if (slotContainer.value) {
    slotContainer.value.removeEventListener('mouseenter', updateCanvas)
    slotContainer.value.removeEventListener('mouseleave', updateCanvas)
    slotContainer.value.removeEventListener('click', updateCanvas)
  }
})

watch(() => slotContainer.value?.innerHTML, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    updateCanvas()
  }
})
</script>
