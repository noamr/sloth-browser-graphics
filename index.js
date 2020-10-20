let nextFrameCallback = null
let worker = null
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

function cancel() {
    if (worker) {
        worker.terminate()
        worker = null
    }
    if (!nextFrameCallback)
        return

    cancelAniamtionFrame(nextFrameCallback)
    nextFrameCallback = null
}

function createNormal() {
    const sloth = document.querySelector('#sloth-ref').cloneNode()
    sloth.id = 'sloth'
    document.querySelector('main').innerHTML = ''
    document.querySelector('main').appendChild(sloth)  
    return sloth  
}

function createCanvas() {
    const sloth = document.querySelector('#sloth-ref').cloneNode()
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    document.querySelector('main').innerHTML = ''
    document.querySelector('main').appendChild(canvas)
    return {canvas, sloth}
}

const runners = {
    layout: () => {
        const element = createNormal()
        element.animate(animationPathAsPixels.map(({x, y}) => ({marginTop: y, marginLeft: x})), {
            duration, iterations: Infinity, direction: 'alternate'
        })
    },

    composite: () => {
        const element = createNormal()
        element.animate(animationPathAsPixels.map(({x, y}) => ({transform: `translate3d(${x}, ${y}, 0)`})), {
            duration, iterations: Infinity, direction: 'alternate'
        })
    },

    transform: () => {
        const element = createNormal()
        frameByFrame(({x, y}) => {
            element.style.transform = `translate3d(${x * canvasWidth}px, ${y * canvasHeight}px, 0)`
        })
    },

    canvas: () => {
        const {canvas, sloth} = createCanvas()
        frameByFrame(({x, y}) => {
            const ctx = canvas.getContext('2d')
            ctx.clearRect(0, 0, canvasWidth, canvasHeight)
            ctx.drawImage(sloth, x * canvasWidth, y * canvasHeight)
        })
    },
    webgl: () => {
        const {canvas, sloth} = createCanvas()
        const {attr_dest} =
        (() => {
            const gl = canvas.getContext('webgl')
            const vshader = gl.createShader(gl.VERTEX_SHADER)
            const fshader = gl.createShader(gl.FRAGMENT_SHADER)
            gl.shaderSource(vshader, `
                precision mediump float;
                attribute vec2 a_src;
                attribute vec2 a_dest;
                varying vec2 v_texCoord;

                void main(void) {
                    gl_Position = vec4(a_dest, 0, 1);
                    v_texCoord = a_src;
                }
            `)
            gl.shaderSource(fshader, `
                precision mediump float;
                uniform sampler2D u_image;
                varying vec2 v_texCoord;
                void main(void) {
                    gl_FragColor = texture2D(u_image, v_texCoord);
                }            
            `)
            gl.compileShader(vshader)
            gl.compileShader(fshader)
            var program = gl.createProgram()
            gl.attachShader(program, vshader)
            gl.attachShader(program, fshader)
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sloth);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.linkProgram(program)
            gl.useProgram(program)
            var attr_src = gl.getAttribLocation(program, "a_src")
            var buff_src = gl.createBuffer()
            var attr_dest = gl.getAttribLocation(program, "a_dest")
            gl.bindBuffer(gl.ARRAY_BUFFER, buff_src)            
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
            gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
            gl.enableVertexAttribArray(attr_src)
            gl.bindBuffer(gl.ARRAY_BUFFER, buff_src)           
            gl.vertexAttribPointer(attr_src, 2, gl.FLOAT, false, 0, 0)
            gl.viewport(0, 0, canvasWidth, canvasHeight)
            var buff_dest = gl.createBuffer()
            gl.enableVertexAttribArray(attr_dest)
            gl.bindBuffer(gl.ARRAY_BUFFER, buff_dest)            
            return {program, attr_src, attr_dest, buff_src, buff_dest}
        })()

        frameByFrame(({x, y}) => {
            const gl = canvas.getContext('webgl')
            gl.viewport(0, 0, canvasWidth, canvasHeight)
            const dx = x * 2 - 1
            const dy = y * -2 + 1
            const width = (slothWidth / canvasWidth) * 2
            const height = (slothHeight / canvasHeight) * 2
            const [x1, y1, x2, y2] = [dx, dy, dx + width, dy - height]
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x2, y2]), gl.STATIC_DRAW)
            gl.vertexAttribPointer(attr_dest, 2, gl.FLOAT, false, 0, 0)
            gl.clearColor(1, 1, 1, 1)
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        })
    },

    offscreen: async () => {
        worker = new Worker('./worker.js')
        const {canvas, sloth} = createCanvas()
        const offscreen = canvas.transferControlToOffscreen()
        const bitmap = await createImageBitmap(sloth)
        worker.postMessage({canvas: offscreen, bitmap}, [offscreen, bitmap])
    }
}

function run() {
    cancel()
    const type = document.querySelector('#typeSelect').value
    runners[type]()
}