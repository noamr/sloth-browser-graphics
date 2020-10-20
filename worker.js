const animationPath = [[0, 0], [.225, 1], [.45, 0], [.675, 1], [.9, 0]].map(([x, y]) => ({x, y}))
const animationPathAsPercentage = animationPath.map(({x, y}) => ({x: `${x * 100}%`, y: `${y * 100}%`}))
const canvasWidth = 600
const canvasHeight = 400
const slothWidth = 102
const slothHeight = 80
const animationPathAsPixels = animationPath.map(({x, y}) => ({x: `${x * canvasWidth}px`, y: `${y * canvasHeight}px`}))
const duration = 3000

function frameByFrame(callback) {
    const start = performance.now()
    const frames = [0, 1, 2, 3, 4, 3, 2, 1, 0]
    
    let i = 0
    function nextFrame() {
        const now = performance.now() - start
        const position = ((now % (duration * 2)) / (duration * 2)) * (frames.length - 1)
        const first = animationPath[frames[Math.floor(position)]]
        const last = animationPath[frames[Math.ceil(position)]]
        const ratio = 1 - (position - Math.floor(position))
        callback({x: first.x * ratio + last.x * (1 - ratio), y: first.y * ratio + last.y * (1 - ratio), })
        requestAnimationFrame(nextFrame)
        ++i
    }

    nextFrame()
}

self.onmessage = ({data}) => {
    const canvas = data.canvas
    frameByFrame(({x, y}) => {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvasWidth, canvasHeight)
        ctx.drawImage(data.bitmap, x * canvasWidth, y * canvasHeight)
        ctx.commit()
    })
}