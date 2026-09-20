import React, { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const [isActive, setIsActive] = useState(false);
  const [variant, setVariant] = useState('default');
  const [isClicking, setIsClicking] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const innerRef = useRef(null);
  const outerRef = useRef(null);
  const requestRef = useRef();

  // Mouse coords
  const mouse = useRef({ x: -100, y: -100 });
  const outerMouse = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateActiveState = () => {
      const active = !coarsePointer.matches && !reducedMotion.matches;
      setIsActive(active);
      if (active) {
        document.documentElement.style.cursor = 'none';
      } else {
        document.documentElement.style.cursor = '';
      }
    };

    updateActiveState();

    coarsePointer.addEventListener('change', updateActiveState);
    reducedMotion.addEventListener('change', updateActiveState);

    return () => {
      coarsePointer.removeEventListener('change', updateActiveState);
      reducedMotion.removeEventListener('change', updateActiveState);
      document.documentElement.style.cursor = '';
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const onMouseMove = (e) => {
      if (!hasMoved) setHasMoved(true);
      mouse.current = { x: e.clientX, y: e.clientY };

      const target = e.target;
      const cursorEl = target.closest('[data-cursor]');
      
      if (cursorEl) {
        setVariant(cursorEl.getAttribute('data-cursor'));
      } else {
        setVariant('default');
      }
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const render = () => {
      outerMouse.current.x = lerp(outerMouse.current.x, mouse.current.x, 0.2);
      outerMouse.current.y = lerp(outerMouse.current.y, mouse.current.y, 0.2);

      if (innerRef.current) {
        innerRef.current.style.transform = `translate3d(calc(${mouse.current.x}px - 50%), calc(${mouse.current.y}px - 50%), 0)`;
      }
      if (outerRef.current) {
        outerRef.current.style.transform = `translate3d(calc(${outerMouse.current.x}px - 50%), calc(${outerMouse.current.y}px - 50%), 0)`;
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isActive]);

  if (!isActive || !hasMoved) return null;

  const innerClass = [
    'fixed top-0 left-0 pointer-events-none z-[9999] transition-all duration-150 ease-out flex items-center justify-center',
    isClicking ? 'scale-75' : 'scale-100',
    variant === 'interactive' ? 'border-[#A9812E]' : 'border-[#14171F]',
    variant === 'text' 
      ? 'w-[1px] h-[16px] bg-[#14171F] border-none' 
      : 'w-[6px] h-[6px] border border-solid'
  ].join(' ');

  const outerClass = [
    'fixed top-0 left-0 pointer-events-none z-[9998] transition-all duration-150 ease-out rounded-[2px] flex items-center justify-center',
    variant === 'interactive' 
      ? 'w-[32px] h-[32px] border-[#A9812E] opacity-100 border border-solid'
      : variant === 'text'
        ? 'w-[12px] h-[12px] border-[#6B6F76] opacity-30 border border-solid'
        : variant === 'drop'
          ? 'w-[48px] h-[48px] border-[#A9812E] opacity-100 border border-dashed'
          : 'w-[22px] h-[22px] border-[#6B6F76] opacity-60 border border-solid'
  ].join(' ');

  return (
    <>
      <div ref={outerRef} className={outerClass}>
        {variant === 'drop' && (
          <span className="absolute top-[48px] left-[24px] text-[10px] font-mono whitespace-nowrap text-[#14171F] transition-opacity duration-100 opacity-100">
            Drop to upload
          </span>
        )}
      </div>
      <div ref={innerRef} className={innerClass}>
        {variant !== 'text' && <div className="w-[2px] h-[2px] bg-[#14171F]" />}
      </div>
    </>
  );
}
