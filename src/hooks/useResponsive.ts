import { useState, useEffect } from 'react';

/**
 * Responsive breakpoint types matching Tailwind CSS defaults
 * - mobile: < 640px (sm breakpoint)
 * - tablet: 640px - 1024px (sm to lg)
 * - desktop: >= 1024px (lg+)
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

/**
 * Custom hook to detect and track responsive breakpoints
 * 
 * @example
 * ```tsx
 * const { isMobile, isTablet, breakpoint } = useResponsive();
 * 
 * if (isMobile) {
 *   // Render mobile layout
 * }
 * ```
 */
export function useResponsive(): ResponsiveState {
  const getBreakpoint = (width: number): Breakpoint => {
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };

  const [state, setState] = useState<ResponsiveState>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);

    return {
      breakpoint,
      isMobile: breakpoint === 'mobile',
      isTablet: breakpoint === 'tablet',
      isDesktop: breakpoint === 'desktop',
      width,
      height,
    };
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events to avoid excessive re-renders
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const breakpoint = getBreakpoint(width);

        setState({
          breakpoint,
          isMobile: breakpoint === 'mobile',
          isTablet: breakpoint === 'tablet',
          isDesktop: breakpoint === 'desktop',
          width,
          height,
        });
      }, 150); // 150ms debounce
    };

    window.addEventListener('resize', handleResize);
    
    // Also listen for orientation changes on mobile devices
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}

/**
 * Hook to get sidebar width based on screen size
 * 
 * @param baseWidth - The base width in pixels for desktop
 * @param type - 'left' or 'right' sidebar
 * @returns Responsive width value (string for mobile/tablet, number for desktop)
 */
export function useResponsiveSidebarWidth(
  baseWidth: number,
  type: 'left' | 'right' = 'left'
): string | number {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    // Mobile: Full-width overlay (85% of viewport)
    return '85vw';
  }

  if (isTablet) {
    // Tablet: Percentage-based (35% for left, 40% for right)
    return type === 'left' ? '35%' : '40%';
  }

  // Desktop: Fixed pixel width
  return baseWidth;
}
