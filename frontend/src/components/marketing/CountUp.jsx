import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export default function CountUp({ target, suffix = "", duration = 1200 }) {
  const [count, setCount] = useState(0);
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
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isVisible) return;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    let start = null;
    let animationFrameId;

    const easeOutQuad = (t) => t * (2 - t);

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const factor = Math.min(progress / duration, 1);
      
      const easedFactor = easeOutQuad(factor);
      setCount(Math.round(easedFactor * target));

      if (progress < duration) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVisible, target, duration, prefersReducedMotion]);

  // Format with commas if large enough
  const formattedCount = new Intl.NumberFormat('en-US').format(count);

  return (
    <span ref={ref} className="font-mono">
      {formattedCount}{suffix}
    </span>
  );
}
