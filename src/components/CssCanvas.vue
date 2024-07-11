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
  console.log(pixels)
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

const renderHtmlToCanvas = async (
  canvas: HTMLCanvasElement,
  html: string,
  imageEffect: (ctx: CanvasRenderingContext2D, ...args: any[]) => void,
  effectArgs: any[]
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = doc.querySelectorAll('img');
  const imageArray = Array.from(images) as HTMLImageElement[];

  const imagePromises: Promise<HTMLImageElement>[] = [];

  // Load and resolve images from the HTML
  imageArray.forEach((img) => {
    const imgPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = img.src;
    });

    imagePromises.push(imgPromise);

    // Remove the image from the HTML content
    img.parentNode?.removeChild(img);
  });

  // Render the modified HTML content to the canvas as an SVG
  const modifiedHtml = doc.body.innerHTML;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${modifiedHtml}</div>
      </foreignObject>
    </svg>
  `;

  const encodedSvg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

  // Load and resolve the SVG image
  const svgPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const htmlImage = new Image();
    htmlImage.onload = () => resolve(htmlImage);
    htmlImage.onerror = reject;
    htmlImage.src = encodedSvg;
  });
  imagePromises.push(svgPromise);

  const loadedImages = await Promise.all(imagePromises);

  // Clear the canvas and draw the SVG image
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(loadedImages[loadedImages.length - 1], 0, 0, canvas.width, canvas.height);

  // Draw other images separately (you might need to position them accordingly)
  loadedImages.slice(0, -1).forEach((image) => {
    ctx.drawImage(image, 0, 0, 500, 500); // Specify x, y, width, and height as needed
  });

  // Apply the image effect
  imageEffect(ctx, ...effectArgs);
};


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
