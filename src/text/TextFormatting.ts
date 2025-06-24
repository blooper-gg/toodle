import type { Color } from "../coreTypes/Color";

export interface TextFormatting {
  /*Horizontal alignment of the text, defaults to center*/
  align?: "left" | "right" | "center";
  /*Font size in pixels. 10 means that a character with an em height of 1 will be 10 pixels high.*/
  fontSize?: number;
  /*RGBA color of the text, defaults to white.*/
  color?: Color;

  /*Options for word wrapping.*/
  wordWrap?: WordWrapOptions;

  /*Options for shrinking the text to fit within the bounds.*/
  shrinkToFit?: ShrinkToFitOptions;
}

export type WordWrapOptions = {
  emWidth: number;
  breakOn?: "word" | "character";
};

export type ShrinkToFitOptions = {
  minFontSize: number;
  maxFontSize?: number;
  maxLines?: number;
  padding?: number;
};
