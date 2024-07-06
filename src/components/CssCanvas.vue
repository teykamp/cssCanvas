<template>
  <div>
    <canvas ref="canvas" :width="width" :height="height" style="position: absolute; top: 0; left: 0"></canvas>
    <div ref="slotContainer" style="opacity: 0; position: absolute; top: 0; left: 0">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const slotContainer = ref(null)
const canvas = ref(null)
const width = 800
const height = 600

const renderHtmlToCanvas = (canvas, html) => {
  const ctx = canvas.getContext('2d')

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
  </foreignObject>
</svg>`

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgObjectUrl = URL.createObjectURL(svgBlob)

  const tempImg = new Image()
  tempImg.addEventListener('load', function () {
    ctx.drawImage(tempImg, 0, 0)
    URL.revokeObjectURL(svgObjectUrl)
  })

  tempImg.src = svgObjectUrl
}

onMounted(async () => {
  await nextTick()
  if (slotContainer.value && canvas.value) {
    const html = slotContainer.value.innerHTML
    renderHtmlToCanvas(canvas.value, html)
  }
})
</script>