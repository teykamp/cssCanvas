const asciiize = (ctx: CanvasRenderingContext2D, cellSize: number) => {
  const convertToEmoji = (brightness: number) => {
    if (brightness > 220) return '❤'
    if (brightness > 160) return '❤'
    if (brightness > 120) return '❤'
    if (brightness > 100) return '❤'
    if (brightness > 80) return '❤'
    if (brightness > 60) return '❤'
    if (brightness > 40) return '❤'
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

const effects = [
  {
    name: 'ascii',
    effect: asciiize,
    args: [7]
  },
]

export { effects }