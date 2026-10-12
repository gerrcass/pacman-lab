/** Left-pads a number with zeros to `width` digits, for score readouts. */
export function padNumber(value: number, width: number): string {
  return String(value).padStart(width, "0");
}
