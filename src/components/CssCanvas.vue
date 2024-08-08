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

import { effects, type Effect } from '@/effects.ts'

const slotContainer = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const { width, height } = {
  width: window.innerWidth - 20,
  height: window.innerHeight - 20
}

const tempCanvas = document.createElement('canvas')
tempCanvas.width = width
tempCanvas.height = height


type ElementInfo = {
  rect: DOMRect,
  children: ElementInfo[],
  element: HTMLElement,
  combinedClass: string,
  imgSrc?: string,
  textContent?: string,
  textPosition?: {
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
  const combinedClass = element.classList.value
  let imgSrc: string | undefined = undefined
  if (element.tagName === 'IMG') imgSrc = (element as HTMLImageElement).src
  let textContent: string | undefined = undefined
  let textPosition: ElementInfo['textPosition'] | undefined = undefined
  if (element.classList.contains('no-transform-text')) {
    textContent = element.textContent || ''
    textPosition = {
      left: rect.left,
      top: rect.top,
      fontSize: styles.fontSize,
      fontFamily: styles.fontFamily,
      color: styles.color,
      textAlign: styles.textAlign,
      width: rect.width
    }
  }
  element.style.color = 'rgba(0, 0, 0, 0)'
  const children = Array.from(element.children).map((child) => getElementInfo(child as HTMLElement))
  return { rect, children, element, imgSrc, combinedClass, textContent, textPosition }
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

  // sets text to invisible to redraw after
  noTextTransformElements.forEach(element => {
    element.style.color = 'rgba(0, 0, 0, 0)'
  })

  return doc.body.innerHTML
}

const parseAndExecuteImageEffectsFromSlotElementClass = (effectString: string, ctx: CanvasRenderingContext2D) => {

  if (effectString.split(' ').includes('no-transform-text')) return // later will still need to run effect on element

  const getEffectName = (effect: Effect): string => {
    return effect.name || effect.effect.name
  }

  const effectTags = new Set(effectString
    .split(' ')
    .filter(tag => tag.startsWith('effect-'))
    .map(tag => tag.substring('effect-'.length))
  )

  const hasEffectAll = effectTags.has('all')

  if (hasEffectAll) {
    effects.forEach(({ effect, args }) => {
      const effectName = getEffectName({ effect, args })

      if (!effectTags.has(effectName)) {
        args ? effect(ctx, ...args) : effect(ctx)
      }
    })
  } else {
    effectTags.forEach(tag => {

      const effectEntry = effects.find(effect => getEffectName(effect) === tag)

      if (effectEntry) {
        const { effect, args } = effectEntry
        args ? effect(ctx, ...args) : effect(ctx)
      } else {
        console.warn(`No effect found for tag: ${tag}`)
      }
    }
    )
  }
}

const combineAndApplyClassTags = (element: ElementInfo, parentClass: string = '') => {
  const classList = element.element.classList
  element.combinedClass = `${parentClass} ${Array.from(classList).join(' ')}`.trim()

  element.children.forEach(child => combineAndApplyClassTags(child, element.combinedClass))
}

const mergeLayers = (canvasToMerge: HTMLCanvasElement, mainCanvasCtx: CanvasRenderingContext2D) => {
  mainCanvasCtx.drawImage(canvasToMerge, 0, 0);
}

const renderHtmlToCanvas = async (canvas: HTMLCanvasElement, html: string) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  elements.value.forEach(element => {
    combineAndApplyClassTags(element)
  })

  const updatedHtml = updateHtmlForCanvas(html)
  const parser = new DOMParser()
  const doc = parser.parseFromString(updatedHtml, 'text/html')

  // get parent wrapper class to use for later when rendering effects fop svg
  let parentClass = ''
  if (doc.body.children.length === 1) {
    const parentElement = doc.body.children[0]
    parentClass = parentElement.className
  }

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

  // rendering happening after this comment!!

  // will need to combine render functions into one with some checks. need to get order right. 
  // no-transform-text class should still render effects on the element, just vanish the text. currently this is done through 
  // setting text to transparent and rendering it last

  // html
  ctx.drawImage(loadedImages[loadedImages.length - 1], 0, 0, canvas.width, canvas.height)
  parseAndExecuteImageEffectsFromSlotElementClass(parentClass, ctx)


  loadedImages.slice(0, -1).forEach((image, index) => {
    const imgElement = imageArray[index]
    const imgInfo = findImageInfo(elements.value, imgElement.src)

    if (imgInfo) {
      const { left, top, width, height } = imgInfo.rect

      const layerCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
      if (layerCtx) {
        // TODO: should be done in one place and not multiple
        layerCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
        layerCtx.drawImage(image, left, top, width, height)
        parseAndExecuteImageEffectsFromSlotElementClass(imgInfo.combinedClass, layerCtx)
        mergeLayers(tempCanvas, ctx)
      }

    } else {
      console.error(`Image info not found for source: ${imgElement.src}`)
    }
  })

  const drawText = (element: ElementInfo) => {
    if (element.textContent && element.textPosition) {
      const { left, top, fontSize, fontFamily, color, textAlign, width } = element.textPosition
      ctx.font = `${fontSize} ${fontFamily}`
      ctx.fillStyle = color === 'rgba(0, 0, 0, 0)' ? 'black' : color
      ctx.textAlign = textAlign as CanvasTextAlign

      let x = left
      if (textAlign === 'center') {
        x += width / 2
      } else if (textAlign === 'right') {
        x += width
      }
      const layerCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
      if (layerCtx) {
        layerCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
        ctx.fillText(element.textContent, x, top + parseInt(fontSize))
        parseAndExecuteImageEffectsFromSlotElementClass(element.combinedClass, layerCtx)
        mergeLayers(tempCanvas, ctx)
      }
    }
    element.children.forEach(child => drawText(child))
  }

  elements.value.forEach(element => {
    drawText(element)
  })
}

const updateCanvas = () => {
  if (slotContainer.value && canvas.value) {
    const html = slotContainer.value.innerHTML
    elements.value = Array.from(slotContainer.value.children).map((child) => getElementInfo(child as HTMLElement))


    // need to edit original array here
    // then need to be able to do this for images and text (although this might be available here for text)


    renderHtmlToCanvas(canvas.value, html)
  }
}

watch(() => slotContainer.value?.innerHTML, (newVal, oldVal) => {
  // handles as though onMounted
  if (newVal !== oldVal) {
    updateCanvas()
  }
})
</script>