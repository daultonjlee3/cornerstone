"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type VirtualWindow = {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  totalHeight: number;
  onScroll: (event: React.UIEvent<HTMLElement>) => void;
};

/** Dependency-free windowed list for large dispatch queues. */
export function useVirtualWindow(
  itemCount: number,
  itemHeight: number,
  containerRef: RefObject<HTMLElement | null>,
  overscan = 4
): VirtualWindow {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight || 480));
    ro.observe(el);
    setViewportHeight(el.clientHeight || 480);
    return () => ro.disconnect();
  }, [containerRef]);

  const totalHeight = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);
  const offsetTop = startIndex * itemHeight;

  const onScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return { startIndex, endIndex, offsetTop, totalHeight, onScroll };
}
