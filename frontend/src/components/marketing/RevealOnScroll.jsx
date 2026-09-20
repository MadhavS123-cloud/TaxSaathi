import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export default function RevealOnScroll({ children, staggerIndex = 0, threshold = 0.15, className = "" }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, prefersReducedMotion]);

  // Initial state vs visible state
  const baseClasses = "transition-all ease-out duration-700";
  // The transition delay gives the stagger effect. Note that we can't use dynamic tailwind classes easily for stagger, 
  // so we'll use an inline style for the transition-delay if staggerIndex is > 0
  const style = !prefersReducedMotion && staggerIndex > 0 
    ? { transitionDelay: `${staggerIndex * 80}ms` } 
    : {};

  const stateClasses = isVisible || prefersReducedMotion
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-4";

  return (
    <div ref={ref} className={`${baseClasses} ${stateClasses} ${className}`} style={style}>
      {children}
    </div>
  );
}
