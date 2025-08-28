import { useState, useEffect, useCallback, useRef } from "react";

interface VirtualizationOptions {
  itemHeight: number;
  overscan?: number; // Number of items to render outside viewport
  containerHeight?: number;
}

interface VirtualizationResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number[];
  totalHeight: number;
  offsetY: number;
}

export function useVirtualization(
  itemCount: number,
  options: VirtualizationOptions
): VirtualizationResult {
  const { itemHeight, overscan = 5, containerHeight = 800 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLElement | null>(null);

  // Calculate visible range
  const calculateVisibleRange = useCallback(() => {
    const viewportStart = Math.floor(scrollTop / itemHeight);
    const viewportEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

    const startIndex = Math.max(0, viewportStart - overscan);
    const endIndex = Math.min(itemCount - 1, viewportEnd + overscan);

    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push(i);
    }

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight: itemCount * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const [virtualizedData, setVirtualizedData] = useState<VirtualizationResult>(
    calculateVisibleRange()
  );

  // Update when scroll position or dependencies change
  useEffect(() => {
    setVirtualizedData(calculateVisibleRange());
  }, [calculateVisibleRange]);

  // Scroll handler
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    }
  }, [handleScroll]);

  // Expose method to set container ref
  const setContainerRef = useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
  }, []);

  return {
    ...virtualizedData,
    setContainerRef,
  } as VirtualizationResult & {
    setContainerRef: (element: HTMLElement | null) => void;
  };
}

// Hook for intersection observer-based visibility detection
export function useIntersectionVirtualization(threshold = 0.1) {
  const [visibleElements, setVisibleElements] = useState<Set<string>>(
    new Set()
  );
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<string, Element>>(new Map());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleElements((prev) => {
          const newSet = new Set(prev);
          entries.forEach((entry) => {
            const id = entry.target.getAttribute("data-block-id");
            if (id) {
              if (entry.isIntersecting) {
                newSet.add(id);
              } else {
                newSet.delete(id);
              }
            }
          });
          return newSet;
        });
      },
      { threshold }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold]);

  const observeElement = useCallback((id: string, element: Element | null) => {
    if (!observerRef.current) return;

    // Unobserve previous element with this id
    const prevElement = elementsRef.current.get(id);
    if (prevElement) {
      observerRef.current.unobserve(prevElement);
      elementsRef.current.delete(id);
    }

    // Observe new element
    if (element) {
      observerRef.current.observe(element);
      elementsRef.current.set(id, element);
    }
  }, []);

  const isVisible = useCallback(
    (id: string) => {
      return visibleElements.has(id);
    },
    [visibleElements]
  );

  return {
    observeElement,
    isVisible,
    visibleElementIds: Array.from(visibleElements),
  };
}
