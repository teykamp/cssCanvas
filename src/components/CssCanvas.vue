<template>
  <div>
    <canvas ref="canvas" :width="width" :height="height" style="position: absolute; top: 0; left: 0"></canvas>
    <div ref="slotContainer" style="opacity: 0; position: absolute; top: 0; left: 0">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'

const slotContainer = ref(null)
const canvas = ref(null)
const width = 800
const height = 600
let observer = null

const renderHtmlToCanvas = (canvas, html) => {
  const ctx = canvas.getContext('2d')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>
  `

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgObjectUrl = URL.createObjectURL(svgBlob)

  const tempImg = new Image()
  tempImg.addEventListener('load', function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear the canvas before drawing
    ctx.drawImage(tempImg, 0, 0)
    URL.revokeObjectURL(svgObjectUrl)
  })

  tempImg.src = svgObjectUrl
}

const updateCanvas = () => {
  if (slotContainer.value && canvas.value) {
    const html = slotContainer.value.innerHTML
    renderHtmlToCanvas(canvas.value, html)
  }
}

onMounted(async () => {
  await nextTick()
  updateCanvas()

  // Set up a MutationObserver to watch for changes in the slot content
  observer = new MutationObserver(updateCanvas)
  if (slotContainer.value) {
    observer.observe(slotContainer.value, { childList: true, subtree: true, characterData: true })
  }

  // Add event listeners for hover and click events
  slotContainer.value.addEventListener('mouseenter', updateCanvas)
  slotContainer.value.addEventListener('mouseleave', updateCanvas)
  slotContainer.value.addEventListener('click', updateCanvas)
})

onBeforeUnmount(() => {
  // Disconnect the MutationObserver when the component is unmounted
  if (observer) {
    observer.disconnect()
  }

  // Remove event listeners
  if (slotContainer.value) {
    slotContainer.value.removeEventListener('mouseenter', updateCanvas)
    slotContainer.value.removeEventListener('mouseleave', updateCanvas)
    slotContainer.value.removeEventListener('click', updateCanvas)
  }
})
</script>
