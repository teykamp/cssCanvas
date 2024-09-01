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
  imgStyles?: CSSStyleDeclaration,
  textContent?: string,
  textPosition?: {
    left: number,
    top: number,
    fontSize: string,
    fontFamily: string,
    color: string,
    textAlign: string,
    width: number,
  },
  svgContent?: string,
}

const elements = ref<ElementInfo[]>([])
const exctractedImages = ref<Promise<HTMLImageElement>[]>([])
const imageArray = ref<HTMLImageElement[]>([])
const htmlToElementMap = ref<Map<string, Element | null>>(new Map())

const getElementInfo = (element: HTMLElement, html: string): ElementInfo => {
  const elementOnDom = htmlToElementMap.value.get(element.outerHTML)

  const rect = elementOnDom ? elementOnDom.getBoundingClientRect() : element.getBoundingClientRect()
  const styles = window.getComputedStyle(elementOnDom ? elementOnDom : element)
  const combinedClass = element.classList.value
  let imgSrc: string | undefined = undefined
  let imgStyles: CSSStyleDeclaration | undefined = undefined
  
  if (element.tagName === 'IMG') {
    imgSrc = (element as HTMLImageElement).src
    imgStyles = styles
  }

  let textContent: string | undefined = undefined
  let textPosition: ElementInfo['textPosition'] | undefined = undefined
  if (element.classList.contains('no-transform-text')) {
    textContent = (elementOnDom ? elementOnDom.textContent : element.textContent) || ''
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

  let svgContent: string | undefined = undefined

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const allElements = Array.from(doc.body.getElementsByTagName("*")) as HTMLElement[]

  allElements.forEach((el) => {
    el.style.visibility = el.innerHTML === element.innerHTML ? 'visible' : 'hidden'
  })
  const modifiedHtml = doc.body.outerHTML
  if (element.tagName !== 'IMG')
  {  
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.value!.width}" height="${canvas.value!.height}">
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

    svgContent = `data:image/svg+xml;base64,${utf8ToBase64(svg)}`
  }

  const children = Array.from(element.children).map((child) => getElementInfo(child as HTMLElement, html))

  return {
    rect,
    children,
    element,
    combinedClass,
    imgSrc,
    imgStyles,
    textContent,
    textPosition,
    svgContent 
  }
}

const findImageInfo = (elements: ElementInfo[], src: string): ElementInfo | null => {
  for (const element of elements) {
    if (element.imgSrc === src || element.svgContent === src) {
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
    const oldHtml = element.outerHTML
    const el = htmlToElementMap.value.get(oldHtml)

    htmlToElementMap.value.delete(oldHtml)

    element.style.color = 'rgba(0, 0, 0, 0)'

    htmlToElementMap.value.set(element.outerHTML, el || null)
  })

  const images = doc.querySelectorAll('img')
  imageArray.value = Array.from(images)

  imageArray.value.forEach((img) => {
    const imgPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      const src = htmlToElementMap.value.get(img.outerHTML) as HTMLImageElement | undefined
      image.src = src?.src || img.src
    })

    exctractedImages.value.push(imgPromise)

    img.parentNode?.removeChild(img)
  })

  return doc.body.innerHTML
} 

const parseAndExecuteImageEffectsFromSlotElementClass = (effectString: string, ctx: CanvasRenderingContext2D, isText: boolean = false) => {


  if (effectString.split(' ').includes('no-transform-text') && isText) return // later will still need to run effect on element

  const getEffectName = (effect: Effect): string => {
    return effect.name ?? effect.effect.name
  }

  const effectTags = new Set(effectString
    .split(' ')
    .filter(tag => tag.startsWith('effect-'))
    .map(tag => tag.substring('effect-'.length))
  )
  
  
  const hasEffectAll = effectTags.has('all')
  
  if (hasEffectAll) {
    effects.forEach(({ name, effect, args }) => {
      const effectName = getEffectName({ name, effect, args })

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
    })
  }
}

const combineAndApplyClassTags = (element: ElementInfo, parentClass: string = '') => {
  const classList = element.element.classList
  element.combinedClass = `${parentClass} ${Array.from(classList).join(' ')}`.trim()

  element.children.forEach(child => combineAndApplyClassTags(child, element.combinedClass))
}

const mergeLayers = (canvasToMerge: HTMLCanvasElement, mainCanvasCtx: CanvasRenderingContext2D) => {
  mainCanvasCtx.drawImage(canvasToMerge, 0, 0)
}

const renderHtmlToCanvas = async (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  elements.value.forEach(element => {
    combineAndApplyClassTags(element)
  })

  const htmlAsImagePromiseList: Promise<HTMLImageElement>[] = []

  const addHTMLElementToArrayAsSVGImage = (svgContent: string) => {

    const svgPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const htmlImage = new Image()
      htmlImage.onload = () => resolve(htmlImage)
      htmlImage.onerror = (error) => {
        console.error('Image failed to load:', error, svgContent)
        reject(error)
      }
      htmlImage.src = svgContent
    })

    htmlAsImagePromiseList.push(svgPromise)
  }

  const processElement = (element: ElementInfo) => { // may want to store a flat version of all elements?
    if (element.svgContent) addHTMLElementToArrayAsSVGImage(element.svgContent)
    element.children.forEach(child => processElement(child))
  }

  elements.value.forEach(element => {
    processElement(element)
  })

  const loadedHTMLAsImages = await Promise.all(htmlAsImagePromiseList)
  
  loadedHTMLAsImages.forEach(image => {
    const layerCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
    const imgInfo = findImageInfo(elements.value, image.src)

    if (layerCtx ) {
      layerCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
      layerCtx.resetTransform()
      layerCtx.drawImage(image, 0, 0, canvas.width, canvas.height)
      if (imgInfo) parseAndExecuteImageEffectsFromSlotElementClass(imgInfo.combinedClass, layerCtx)
      mergeLayers(tempCanvas, ctx)
    }
  })
  
  const loadedImages = await Promise.all(exctractedImages.value)

  loadedImages.forEach((image, index) => {
    const imgElement = htmlToElementMap.value.get(imageArray.value[index].outerHTML) as HTMLImageElement ?? imageArray.value[index]
    const { left, top, width: boundingBoxWidth, height: boundingBoxHeight } = imgElement.getBoundingClientRect()
    const styles = imgElement.style
    const actualImageWidth = parseFloat(styles.width)
    const actualImageHeight = parseFloat(styles.height)
    const transform = styles.transform
    const opacity = parseFloat(styles.opacity)

    const layerCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
    if (layerCtx) {
      layerCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
      
      layerCtx.save()
      
      if (transform) {

        layerCtx.translate(left + boundingBoxWidth / 2, top + boundingBoxHeight / 2)
        
        const matrix = new DOMMatrix(transform)
        layerCtx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
        
        layerCtx.translate(-(left + actualImageWidth / 2), -(top + actualImageHeight / 2))
      }

      if (!isNaN(opacity)) {
        layerCtx.globalAlpha = opacity
      }

      layerCtx.drawImage(image, left, top, actualImageWidth, actualImageHeight)
      layerCtx.restore()

      const classes: string[] = []
      let parent = imgElement.parentElement
      classes.push(...imgElement.classList)
      while (parent) {
        if (parent.classList.length > 0) {
          classes.push(...parent.classList)
        }
        parent = parent.parentElement
      }

      parseAndExecuteImageEffectsFromSlotElementClass(classes.join(' '), layerCtx)
      mergeLayers(tempCanvas, ctx)
    }
  })


  const drawText = (element: ElementInfo) => {
    if (element.textContent && element.textPosition) {
      const layerCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
      if (!layerCtx) return
      const { left, top, fontSize, fontFamily, color, textAlign, width } = element.textPosition
      layerCtx.font = `${fontSize} ${fontFamily}`
      layerCtx.fillStyle = color ?? 'black'
      layerCtx.textAlign = textAlign as CanvasTextAlign
      let x = left
      if (textAlign === 'center') {
        x += width / 2
      } else if (textAlign === 'right') {
        x += width
      }
      if (layerCtx) {
        layerCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
        layerCtx.resetTransform()
        
        layerCtx.fillText(element.textContent, x, top + parseInt(fontSize))
        parseAndExecuteImageEffectsFromSlotElementClass(element.combinedClass, layerCtx, true)
        
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

    const mapHtmlToChildren = (element: Element) => {
      const htmlToChildMap = new Map<string, Element>()

      const traverseAndMap = (el: Element) => {
        const elHtml = el.outerHTML
        htmlToChildMap.set(elHtml, el)
        Array.from(el.children).forEach(traverseAndMap)
      }
      traverseAndMap(element)

      return htmlToChildMap
    }

    htmlToElementMap.value = mapHtmlToChildren(slotContainer.value)


    const html = updateHtmlForCanvas(slotContainer.value.innerHTML)

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')


    elements.value = Array.from(doc.body.children).map((child) => getElementInfo(child as HTMLElement, html))

    renderHtmlToCanvas(canvas.value)
  }
}

watch(() => slotContainer.value?.innerHTML, (newVal, oldVal) => {
  // handles as though onMounted
  if (newVal !== oldVal) {
    updateCanvas()
  }
})
</script>