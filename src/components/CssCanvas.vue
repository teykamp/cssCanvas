<template>
  <div>
    <canvas ref="canvas" :width="width" :height="height" style="position: absolute; top: 0; left: 0"></canvas>
    <div ref="slotContainer" style="opacity: 0; position: absolute; top: 0; left: 0">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'

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
    if (brightness > 80) return '🙌'
    if (brightness > 60) return '👌'
    if (brightness > 40) return '✔'
    return ' '
  }

  const pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (let y = 0; y < pixels.height; y += cellSize) {
    for (let x = 0; x < pixels.width; x += cellSize) {
      const pixelPosition = 4 * (pixels.width * y + x)
      if (pixels.data[pixelPosition + 3] > 50) {
        const [red, green, blue] = [pixels.data[pixelPosition], pixels.data[pixelPosition + 1], pixels.data[pixelPosition + 2]]
        const brightness = (red + green + blue) / 3
        const symbol = convertToEmoji(brightness)
        const color = `rgba(${red + 20}, ${green + 20}, ${blue + 20}, 1)`
        ctx.font = cellSize + 'px Times New Roman'
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
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>
  `

  const encodedSvg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}` // avoid cors

  const tempImg = new Image()
  tempImg.addEventListener('load', function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(tempImg, 0, 0)

    imageEffect(ctx, ...effectArgs)
  })

  tempImg.src = encodedSvg
}

const updateCanvas = () => {
  if (slotContainer.value && canvas.value) {
    const html = slotContainer.value.innerHTML
    renderHtmlToCanvas(canvas.value, html, asciiize, [15])
  }
}

// Throttle function to limit the rate of canvas updates
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean
  return function (...args: any[]) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

const throttledUpdateCanvas = throttle(updateCanvas, 0)

onMounted(async () => {
  await nextTick()
  updateCanvas()

  if (slotContainer.value) {
    const observer = new MutationObserver(throttledUpdateCanvas)
    observer.observe(slotContainer.value, { childList: true, subtree: true, attributes: true })

    slotContainer.value.__observer = observer
  }
})

onBeforeUnmount(() => {
  if (slotContainer.value?.__observer) {
    slotContainer.value.__observer.disconnect()
  }
})
</script>