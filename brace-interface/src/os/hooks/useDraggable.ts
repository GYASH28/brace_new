import { useEffect, useRef, useState } from "react";

export function useDraggable(
  initialX: number,
  initialY: number,
  onDragEnd?: (x: number, y: number) => void
) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  useEffect(() => {
    setPosition({ x: initialX, y: initialY });
  }, [initialX, initialY]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only drag on left click
    if (e.button !== 0) return;
    
    // Prevent dragging if clicking a button inside the drag handle
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
    
    // Capture pointer to track outside window
    if (e.currentTarget instanceof Element) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const newX = dragRef.current.initialX + dx;
    const newY = Math.max(0, dragRef.current.initialY + dy); // Prevent dragging above top edge

    setPosition({ x: newX, y: newY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (onDragEnd) {
      onDragEnd(position.x, position.y);
    }
    
    if (e.currentTarget instanceof Element) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return {
    position,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
