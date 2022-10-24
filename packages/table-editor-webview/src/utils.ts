
import React from 'react';
import dayjs from 'dayjs';

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

export function smartCompare(s1: string, s2: string) {
  const f1 = Number(s1);
  const f2 = Number(s2);
  if (!isNaN(f1) || !isNaN(f2)) {
    return f1 > f2 ? 1 : f1 < f2 ? -1 : 0;
  }
  const d1 = dayjs(s1);
  const d2 = dayjs(s2);
  if (d1.isValid() && d2.isValid()) {
    return d1.isAfter(d2) ? 1 : d1.isBefore(d2) ? -1 : 0;
  }
  // in case we have a mix of numbers, dates, and strings, we want to 
  // the values of each type to be grouped by the ordering:
  const score1 = 2 * Number(!isNaN(f1)) + Number(d1.isValid());
  const score2 = 2 * Number(!isNaN(f2)) + Number(d2.isValid());
  if (score1 !== score2) return score1 > score2 ? 1 : -1;
  // finally, compare as strings:
  return s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
}