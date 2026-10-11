export type Viewport = {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
};

export function fitViewport(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
): Viewport {
  const rawScale = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight);
  const scale = Math.max(1, Math.floor(rawScale));
  const offsetX = Math.floor((viewportWidth - contentWidth * scale) / 2);
  const offsetY = Math.floor((viewportHeight - contentHeight * scale) / 2);
  return { scale, offsetX, offsetY };
}
