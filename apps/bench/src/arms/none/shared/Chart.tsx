import type { MouseEvent, ReactNode } from 'react';

export function pointer(e: MouseEvent<SVGSVGElement>): [number, number] {
  const box = e.currentTarget.getBoundingClientRect();
  return [e.clientX - box.left, e.clientY - box.top];
}

export function plotPointer(
  e: MouseEvent<SVGSVGElement>,
  [x0, x1]: [number, number],
  [y0, y1]: [number, number],
): [number, number] | null {
  const [px, py] = pointer(e);
  return px >= x0 && px <= x1 && py <= y0 && py >= y1 ? [px, py] : null;
}

export function Tooltip({
  left,
  top,
  width,
  height,
  children,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  children: ReactNode;
}) {
  const flipX = left > width / 2;
  const flipY = top > height / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: left + (flipX ? -12 : 12),
        top: top + (flipY ? -12 : 12),
        transform: `translate(${flipX ? -100 : 0}%, ${flipY ? -100 : 0}%)`,
        pointerEvents: 'none',
        background: 'white',
        border: '1px solid #ccc',
        padding: '4px 8px',
        fontSize: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}
