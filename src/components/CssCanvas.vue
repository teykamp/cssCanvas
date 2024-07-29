<template>
  <div>
    <canvas ref="canvas" :width="width" :height="height" style="position: absolute; top: 0; left: 0"></canvas>
    <div ref="slotContainer" style="opacity: 0; position: absolute; top: 0; left: 0">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const slotContainer = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const { width, height } = {
  width: window.innerWidth - 20,
  height: window.innerHeight - 20
}

type ElementInfo = {
  rect: DOMRect,
  children: ElementInfo[],
  element: HTMLElement,
  imgSrc?: string,
  imgStyles?: CSSStyleDeclaration,
  textContent?: string,
  testStyles?: {
    left: number,
    top: number,
    fontSize: string,
    fontFamily: string,
    color: string,
    textAlign: string,
    width: number,
  }
}

const elements = ref<ElementInfo[]>([])

const getElementInfo = (element: HTMLElement): ElementInfo => {
  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  let imgSrc: string | undefined = undefined
  let imgStyles: CSSStyleDeclaration | undefined = undefined
  if (element.tagName === 'IMG') {
    imgSrc = (element as HTMLImageElement).src
    imgStyles = styles
  }
  let textContent: string | undefined = undefined
  let testStyles: ElementInfo['testStyles'] | undefined = undefined
  if (element.classList.contains('no-transform-text')) {
    textContent = element.textContent || ''
    testStyles = {
      left: rect.left,
      top: rect.top,
      fontSize: styles.fontSize,
      fontFamily: styles.fontFamily,
      color: styles.color,
      textAlign: styles.textAlign,
      width: rect.width
    }
  }
  const children = Array.from(element.children).map((child) => getElementInfo(child as HTMLElement))
  return { rect, children, element, imgSrc, imgStyles, textContent, testStyles }
}

const asciiize = (ctx: CanvasRenderingContext2D, cellSize: number) => {
  const convertToEmoji = (brightness: number) => {
    return '❤'
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
        const symbol = convertToEmoji(brightness)
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

const findImageInfo = (elements: ElementInfo[], src: string): ElementInfo | null => {
  for (let element of elements) {
    if (element.imgSrc === src) {
      return element
    } else if (element.children) {
      const found = findImageInfo(element.children, src)
      if (found) return found
    }
  }
  return null
}

const updateHtmlForCanvas = (html: string): string => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const noTextTransformElements = doc.querySelectorAll('.no-transform-text') as NodeListOf<HTMLElement>

  noTextTransformElements.forEach(element => {
    element.style.color = 'rgba(0, 0, 0, 0)'
  })

  return doc.body.innerHTML
}

const renderHtmlToCanvas = async (
  canvas: HTMLCanvasElement,
  html: string,
  imageEffects: ({
    effect: (ctx: CanvasRenderingContext2D, ...args: any[]) => void,
    args?: any[]
  })[],
) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  const updatedHtml = updateHtmlForCanvas(html)
  const parser = new DOMParser()
  const doc = parser.parseFromString(updatedHtml, 'text/html')
  const images = doc.querySelectorAll('img')
  const imageArray = Array.from(images) as HTMLImageElement[]

  const imagePromises: Promise<HTMLImageElement>[] = []

  imageArray.forEach((img) => {
    const imgPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = img.src
    })

    imagePromises.push(imgPromise)

    img.parentNode?.removeChild(img)
  })

  const modifiedHtml = doc.body.innerHTML
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${modifiedHtml}</div>
      </foreignObject>
    </svg>
  `

  const utf8ToBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16))
    }))
  }

  const encodedSvg: string = `data:image/svg+xml;base64,${utf8ToBase64(svg)}`


  const svgPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const htmlImage = new Image()
    htmlImage.onload = () => resolve(htmlImage)
    htmlImage.onerror = reject
    htmlImage.src = encodedSvg
  })
  imagePromises.push(svgPromise)

  const loadedImages = await Promise.all(imagePromises)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(loadedImages[loadedImages.length - 1], 0, 0, canvas.width, canvas.height)

  loadedImages.slice(0, -1).forEach((image, index) => {
    const imgElement = imageArray[index]
    const imgInfo = findImageInfo(elements.value, imgElement.src)

    if (imgInfo && imgInfo.imgStyles) {
      const { left, top } = imgInfo.rect
      const styles = imgInfo.imgStyles

      const width = parseFloat(styles.width)
      const height = parseFloat(styles.height)

      const transform = styles.transform
      const opacity = parseFloat(styles.opacity)

      ctx.save()
      if (transform) {
        const matrix = new DOMMatrix(transform)
        const centerX = left + width / 2
        const centerY = top + height / 2

        ctx.translate(centerX, centerY)
        ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
        ctx.translate(-centerX, -centerY)
      }

      if (!isNaN(opacity)) {
        ctx.globalAlpha = opacity
      }
      ctx.drawImage(image, left, top, width, height)
      ctx.restore()
    } else {
      console.error(`Image info not found for source: ${imgElement.src}`)
    }
  })

  imageEffects.forEach(imageEffect => {
    const { effect, args } = imageEffect
    args ? effect(ctx, ...args) : effect(ctx)
  })

  const drawText = (element: ElementInfo) => {
    if (element.textContent && element.testStyles) {
      const { left, top, fontSize, fontFamily, color, textAlign, width } = element.testStyles
      console.log(color, element.textContent)
      ctx.font = `${fontSize} ${fontFamily}`
      ctx.fillStyle = color
      ctx.textAlign = textAlign as CanvasTextAlign

      let x = left
      if (textAlign === 'center') {
        x += width / 2
      } else if (textAlign === 'right') {
        x += width
      }

      ctx.fillText(element.textContent, x, top + parseInt(fontSize))
    }

    element.children.forEach(child => drawText(child))
  }

  elements.value.forEach(element => drawText(element))
}

const updateCanvas = () => {
  if (slotContainer.value && canvas.value) {
    const html = slotContainer.value.innerHTML
    elements.value = Array.from(slotContainer.value.children).map((child) => getElementInfo(child as HTMLElement))
    renderHtmlToCanvas(canvas.value, html, [
      {
        effect: asciiize,
        args: [7]
      },
    ])
  }
}

watch(() => slotContainer.value?.innerHTML, (newVal, oldVal) => {
  // handles as though onMounted
  if (newVal !== oldVal) {
    updateCanvas()
  }
})

</script>
