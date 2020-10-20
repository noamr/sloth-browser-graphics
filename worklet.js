class ImagePainter {
  static get inputProperties() { return ['--image', '--x', '--y'] }
    paint(ctx, geom, props) {
        console.log(props.get('--image'))
        ctx.drawImage(props.get('--image'), props.get('--x'), props.get('--y'))
    }
} 
// Register our class under a specific name
registerPaint('image-painter', ImagePainter);