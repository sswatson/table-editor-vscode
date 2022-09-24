
import React from 'react';

export function cmd(e: React.KeyboardEvent) {
  const isMacOs = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return ((!isMacOs && e.ctrlKey) || e.metaKey)
}

export class TextWidthMeasurer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d")!;
  }

  measure(text: string, font: string) {
    if (text.length === 0) return 0;
    this.context.font = font;
    return this.context.measureText(text).width;
  }
}