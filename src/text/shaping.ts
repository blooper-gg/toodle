import type { Size } from "../coreTypes/Size";
import { type MsdfChar, type MsdfFont, WhitespaceKeyCodes } from "./MsdfFont";
import type { TextFormatting, WordWrapOptions } from "./TextFormatting";

// shaping is responsible for cpu-side text shaping:
// - measuring a text block
// - calculating the glyph quads for the text block
// - applying word wrap, shrink-to-fit, justification and other formatting options
// - returning the text measurements and glyph quads
const TAB_SPACES = 4;

export interface MsdfTextMeasurements {
  /** The width of the text block in em units. */
  width: number;
  /** The height of the text block in em units. */
  height: number;
  /** The width of each line in em units. */
  lineWidths: number[];
  /** The number of lines in the text block. */
  lineCount: number;
  /** The number of characters printed in the text block. */
  printedCharCount: number;

  /** All words in the text block */
  words: Word[];
}

export type Glyph = {
  char: MsdfChar;
  offset: [number, number];
  line: number;
};

export type Word = {
  glyphs: Glyph[];
  width: number;
  startX: number;
  startY: number;
};

export function shapeText(
  font: MsdfFont,
  text: string,
  blockSize: Size,
  fontSize: number,
  formatting: TextFormatting,
  textArray: Float32Array,
  initialFloatOffset = 0,
  debug = false,
) {
  let offset = initialFloatOffset;

  const measurements = measureText(font, text, formatting.wordWrap);
  const alignment = formatting.align || "left";
  const em2px = fontSize / font.lineHeight;
  // currently there is a code path that sets blockSize.width to measurements.width (em)
  // if blockSize is not explicitly set (px)
  const hackHasExplicitBlock = blockSize.width !== measurements.width;

  let debugData: any[] | null = null;
  if (debug) {
    debugData = [];
  }

  for (const word of measurements.words) {
    for (const glyph of word.glyphs) {
      let lineOffset = 0;
      if (alignment === "center") {
        lineOffset =
          measurements.width * -0.5 -
          (measurements.width - measurements.lineWidths[glyph.line]) * -0.5;
      } else if (alignment === "right") {
        const blockSizeEm = blockSize.width / em2px;

        const delta = measurements.width - measurements.lineWidths[glyph.line];

        lineOffset =
          (hackHasExplicitBlock ? blockSizeEm / 2 : measurements.width / 2) -
          measurements.width +
          delta;
      } else if (alignment === "left") {
        const blockSizeEm = blockSize.width / em2px;

        lineOffset = hackHasExplicitBlock
          ? -blockSizeEm / 2
          : -measurements.width / 2;
      }

      if (debug && debugData) {
        debugData.push({
          line: glyph.line,
          word: word.glyphs.map((g) => g.char.char).join(""),
          glyph: glyph.char.char,
          startX: word.startX,
          glyphX: glyph.offset[0],
          advance: glyph.char.xadvance,
          lineOffset,
          startY: word.startY,
          glyphY: glyph.offset[1],
        });
      }
      textArray[offset] = word.startX + glyph.offset[0] + lineOffset;
      textArray[offset + 1] = word.startY + glyph.offset[1];
      textArray[offset + 2] = glyph.char.charIndex;

      offset += 4;
    }
  }

  if (debug && debugData) {
    console.table(debugData);
  }
}

/**
 * Measure the text and return measurements for block + each glyph.
 * @param font - The font to use.
 * @param text - The text to measure
 * @param wordWrap - Maximum word length before word wrapping
 * @returns The measurements of the text in em units.
 */
export function measureText(
  font: MsdfFont,
  text: string,
  wordWrap?: WordWrapOptions,
): MsdfTextMeasurements {
  let maxWidth = 0;
  const lineWidths: number[] = [];

  let textOffsetX = 0;
  let textOffsetY = 0;
  let line = 0;
  let printedCharCount = 0;
  let nextCharCode = text.charCodeAt(0);
  let word: Word = { glyphs: [], width: 0, startX: 0, startY: 0 };

  const words: Word[] = [];

  for (let i = 0; i < text.length; i++) {
    const isLastLetter = i === text.length - 1;

    const charCode = nextCharCode;
    nextCharCode = i < text.length - 1 ? text.charCodeAt(i + 1) : -1;

    switch (charCode) {
      case WhitespaceKeyCodes.HorizontalTab:
        insertSpaces(TAB_SPACES);
        break;
      case WhitespaceKeyCodes.Newline:
        flushLine();
        flushWord();
        break;
      case WhitespaceKeyCodes.CarriageReturn:
        break;
      case WhitespaceKeyCodes.Space:
        insertSpaces(1);
        break;
      default: {
        const advance = font.getXAdvance(charCode, nextCharCode);
        if (
          wordWrap &&
          wordWrap.breakOn === "character" &&
          textOffsetX + advance > wordWrap.emWidth
        ) {
          if (word.startX === 0) {
            flushWord();
          } else {
            lineWidths.push(textOffsetX - word.width);
            line++;
            maxWidth = Math.max(maxWidth, textOffsetX);
            textOffsetX = word.width;
            textOffsetY -= font.lineHeight;
            word.startX = 0;
            word.startY = textOffsetY;
            word.glyphs.forEach((g) => {
              g.line = line;
            });
          }
        }
        word.glyphs.push({
          char: font.getChar(charCode),
          offset: [word.width, 0],
          line,
        });

        if (isLastLetter) {
          flushWord();
        }

        word.width += advance;
        textOffsetX += advance;
      }
    }
  }

  lineWidths.push(textOffsetX);
  maxWidth = Math.max(maxWidth, textOffsetX);

  const lineCount = lineWidths.length;

  return {
    width: maxWidth,
    height: lineCount * font.lineHeight,
    lineWidths,
    lineCount,
    printedCharCount,
    words,
  };

  function flushWord() {
    printedCharCount += word.glyphs.length;
    words.push(word);
    word = {
      glyphs: [],
      width: 0,
      startX: textOffsetX,
      startY: textOffsetY,
    };
  }

  function flushLine() {
    lineWidths.push(textOffsetX);
    line++;
    maxWidth = Math.max(maxWidth, textOffsetX);
    textOffsetX = 0;
    textOffsetY -= font.lineHeight;
  }

  function insertSpaces(spaces: number) {
    if (spaces < 1) spaces = 1;
    textOffsetX += font.getXAdvance(WhitespaceKeyCodes.Space) * spaces;
    if (wordWrap?.breakOn === "word" && textOffsetX >= wordWrap.emWidth) {
      flushLine();
    }
    flushWord();
  }
}
export function findLargestFontSize(
  font: MsdfFont,
  text: string,
  size: Size,
  formatting: TextFormatting,
): number | undefined {
  if (!formatting.fontSize) {
    throw new Error("fontSize is required for shrinkToFit");
  }
  if (!formatting.shrinkToFit) {
    throw new Error("shrinkToFit is required for findLargestFontSize");
  }
  // Binary search to find largest font size that fits
  const minSize = formatting.shrinkToFit.minFontSize;
  const maxSize = formatting.shrinkToFit.maxFontSize ?? formatting.fontSize;
  const maxLines = formatting.shrinkToFit.maxLines ?? Number.POSITIVE_INFINITY;

  const threshold = 0.5;
  let low = minSize;
  let high = maxSize;

  while (high - low > threshold) {
    // Stop when we get close enough
    const testSize = (low + high) / 2;
    const testMeasure = measureText(font, text, formatting.wordWrap);

    const padding = formatting.shrinkToFit.padding ?? 0;

    const scaledWidth = testMeasure.width * (testSize / font.lineHeight);
    const scaledHeight = testMeasure.height * (testSize / font.lineHeight);
    const fitsWidth = scaledWidth <= size.width - size.width * padding;
    const fitsHeight = scaledHeight <= size.height - size.height * padding;
    const fitsLines = testMeasure.lineCount <= maxLines;

    if (fitsWidth && fitsHeight && fitsLines) {
      low = testSize;
    } else {
      high = testSize;
    }
  }

  return low;
}
