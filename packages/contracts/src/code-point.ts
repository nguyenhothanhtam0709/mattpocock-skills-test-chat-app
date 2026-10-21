/** The code point of one character taken from iterating a string (never empty, so never undefined). */
export function codePointOf(char: string): number {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) throw new Error('Expected a non-empty character');
  return codePoint;
}
