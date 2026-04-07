import { FrameBufferRenderable, RGBA, type OptimizedBuffer, type RenderContext } from "@opentui/core";
import type { FrameBufferOptions } from "@opentui/core";

type ProgressMode = "determinate" | "indeterminate";

type ProgressBarOptions = Omit<FrameBufferOptions, "height"> & {
  value?: number;
  mode?: ProgressMode;
  emptyChar?: string;
  fillChar?: string;
  pulseChar?: string;
  trackColor?: string;
  fillColor?: string;
  pulseColor?: string;
};

const TRACK_COLOR = RGBA.fromHex("#1e293b");
const FILL_COLOR = RGBA.fromHex("#38bdf8");
const PULSE_COLOR = RGBA.fromHex("#7dd3fc");
const TEXT_COLOR = RGBA.fromHex("#e2e8f0");
const BACKGROUND_COLOR = RGBA.fromHex("#020617");

export class ProgressBarRenderable extends FrameBufferRenderable {
  private mode: ProgressMode;
  private progress: number;
  private emptyChar: string;
  private fillChar: string;
  private pulseChar: string;
  private trackColor: RGBA;
  private fillColorValue: RGBA;
  private pulseColorValue: RGBA;

  constructor(ctx: RenderContext, options: ProgressBarOptions) {
    super(ctx, {
      ...options,
      height: 1,
    });

    this.mode = options.mode ?? "determinate";
    this.progress = clampProgress(options.value ?? 0);
    this.emptyChar = options.emptyChar ?? "░";
    this.fillChar = options.fillChar ?? "█";
    this.pulseChar = options.pulseChar ?? "▓";
    this.trackColor = options.trackColor ? RGBA.fromHex(options.trackColor) : TRACK_COLOR;
    this.fillColorValue = options.fillColor ? RGBA.fromHex(options.fillColor) : FILL_COLOR;
    this.pulseColorValue = options.pulseColor ? RGBA.fromHex(options.pulseColor) : PULSE_COLOR;

    this.drawBar();
  }

  set value(value: number) {
    this.progress = clampProgress(value);
    this.drawBar();
    this.requestRender();
  }

  set indeterminate(value: boolean) {
    this.mode = value ? "indeterminate" : "determinate";
    this.drawBar();
    this.requestRender();
  }

  set fillColor(color: string) {
    this.fillColorValue = RGBA.fromHex(color);
    this.drawBar();
    this.requestRender();
  }

  protected override renderSelf(buffer: OptimizedBuffer) {
    this.drawBar();
    super.renderSelf(buffer);
  }

  private drawBar() {
    const width = Math.max(0, this.width);

    this.frameBuffer.fillRect(0, 0, width, 1, BACKGROUND_COLOR);

    if (width === 0) {
      return;
    }

    for (let x = 0; x < width; x++) {
      this.frameBuffer.setCell(x, 0, this.emptyChar, this.trackColor, BACKGROUND_COLOR);
    }

    if (this.mode === "indeterminate") {
      const pulseWidth = Math.max(1, Math.floor(width / 4));
      const maxOffset = Math.max(1, width + pulseWidth);
      const offset = Math.floor((Date.now() / 75) % maxOffset) - pulseWidth;

      for (let x = 0; x < pulseWidth; x++) {
        const drawX = offset + x;

        if (drawX < 0 || drawX >= width) {
          continue;
        }

        this.frameBuffer.setCell(drawX, 0, this.pulseChar, this.pulseColorValue, BACKGROUND_COLOR);
      }

      return;
    }

    const filled = Math.round((this.progress / 100) * width);

    for (let x = 0; x < filled; x++) {
      this.frameBuffer.setCell(x, 0, this.fillChar, this.fillColorValue, BACKGROUND_COLOR);
    }

    if (filled > 0 && filled < width) {
      this.frameBuffer.setCell(filled - 1, 0, this.fillChar, TEXT_COLOR, BACKGROUND_COLOR);
    }
  }
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}
