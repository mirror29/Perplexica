declare module 'canvas' {
  type ImageFormat = 'image/png' | 'image/jpeg' | 'application/pdf' | 'raw';

  export interface Canvas {
    width: number;
    height: number;
    getContext(type: '2d'): CanvasRenderingContext2D;
    toBuffer(format: ImageFormat, config?: any): NodeJS.Buffer;
    createPNGStream(config?: any): any;
    createJPEGStream(config?: any): any;
    createPDFStream(config?: any): any;
  }

  export interface CanvasRenderingContext2D {
    // 绘图基本属性
    fillStyle: string | CanvasGradient | CanvasPattern;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    lineWidth: number;
    lineCap: string;
    lineJoin: string;
    miterLimit: number;

    // 文本相关属性
    font: string;
    textAlign: 'start' | 'end' | 'left' | 'right' | 'center';
    textBaseline:
      | 'top'
      | 'hanging'
      | 'middle'
      | 'alphabetic'
      | 'ideographic'
      | 'bottom';

    // 绘图方法
    beginPath(): void;
    closePath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    arc(
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      anticlockwise?: boolean,
    ): void;
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
    bezierCurveTo(
      cp1x: number,
      cp1y: number,
      cp2x: number,
      cp2y: number,
      x: number,
      y: number,
    ): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    rect(x: number, y: number, w: number, h: number): void;

    // 路径处理
    fill(): void;
    stroke(): void;
    clip(): void;

    // 矩形操作
    fillRect(x: number, y: number, w: number, h: number): void;
    strokeRect(x: number, y: number, w: number, h: number): void;
    clearRect(x: number, y: number, w: number, h: number): void;

    // 文本操作
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    strokeText(text: string, x: number, y: number, maxWidth?: number): void;
    measureText(text: string): TextMetrics;

    // 图片操作
    drawImage(image: any, dx: number, dy: number): void;
    drawImage(image: any, dx: number, dy: number, dw: number, dh: number): void;
    drawImage(
      image: any,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ): void;

    // Canvas特有属性
    patternQuality: 'fast' | 'good' | 'best' | 'nearest' | 'bilinear';
    quality: 'fast' | 'good' | 'best' | 'nearest' | 'bilinear';
    textDrawingMode: 'path' | 'glyph';

    // 状态管理
    save(): void;
    restore(): void;

    // 变换
    scale(x: number, y: number): void;
    rotate(angle: number): void;
    translate(x: number, y: number): void;
    transform(
      a: number,
      b: number,
      c: number,
      d: number,
      e: number,
      f: number,
    ): void;
    setTransform(
      a: number,
      b: number,
      c: number,
      d: number,
      e: number,
      f: number,
    ): void;
  }

  export interface TextMetrics {
    width: number;
    actualBoundingBoxLeft?: number;
    actualBoundingBoxRight?: number;
    actualBoundingBoxAscent?: number;
    actualBoundingBoxDescent?: number;
  }

  export function createCanvas(width: number, height: number): Canvas;
  export function loadImage(src: string | Buffer): Promise<any>;
  export const backends: {
    createBackend(name: string): any;
  };
}
