import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const GOLD = '#C9A96E';
const CREAM = '#F3EDE2';

export default function CustomCursor() {
  const path = useLocation().pathname;
  const onLanding = path === '/' || path === '/login';
  const [isActive, setIsActive] = useState(false);
  const [variant, setVariant] = useState('default');
  const [isClicking, setIsClicking] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [pulse, setPulse] = useState(0);

  const innerRef = useRef(null);
  const outerRef = useRef(null);
  const requestRef = useRef();

  const mouse = useRef({ x: -100, y: -100 });
  const outerMouse = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateActiveState = () => {
      const active = !coarsePointer.matches && !reducedMotion.matches;
      setIsActive(active);
      document.documentElement.style.cursor = active ? 'none' : '';
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
    if (!isActive) return undefined;

    const onMouseMove = (event) => {
      if (!hasMoved) setHasMoved(true);
      mouse.current = { x: event.clientX, y: event.clientY };

      const cursorEl = event.target?.closest?.('[data-cursor]');
      const next = cursorEl?.getAttribute('data-cursor') || 'default';
      setVariant((current) => (current === next ? current : next));
    };

    const onMouseDown = () => {
      setIsClicking(true);
      setPulse((count) => count + 1);
    };
    const onMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isActive, hasMoved]);

  useEffect(() => {
    if (!isActive) return undefined;

    const lerp = (start, end, factor) => start + (end - start) * factor;
    const place = (node, point) => {
      if (!node) return;
      node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
    };

    const render = () => {
      place(innerRef.current, mouse.current);
      if (!onLanding) {
        const dx = mouse.current.x - outerMouse.current.x;
        const dy = mouse.current.y - outerMouse.current.y;
        if (dx * dx + dy * dy > 160000) {
          outerMouse.current.x = mouse.current.x;
          outerMouse.current.y = mouse.current.y;
        } else {
          outerMouse.current.x = lerp(outerMouse.current.x, mouse.current.x, 0.45);
          outerMouse.current.y = lerp(outerMouse.current.y, mouse.current.y, 0.45);
        }
        place(outerRef.current, outerMouse.current);
      }
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isActive, onLanding]);

  if (!isActive || !hasMoved) return null;

  if (onLanding) {
    if (variant === 'text') {
      return (
        <div ref={innerRef} className="pointer-events-none fixed left-0 top-0 z-[9999]" aria-hidden="true">
          <span className="block h-5 w-px" style={{ background: CREAM }} />
        </div>
      );
    }
    const hovering = variant === 'interactive';
    const ringState = isClicking ? 'press' : hovering ? 'hot' : 'idle';
    const armScale = isClicking ? 1.12 : hovering ? 0.72 : 1;
    const dotScale = isClicking ? 0.65 : hovering ? 1.45 : 1;
    return (
      <div ref={innerRef} className="pointer-events-none fixed left-0 top-0 z-[9999] h-11 w-11" aria-hidden="true">
        {pulse > 0 && <span key={pulse} className="cursor-ripple" />}
        <span className="cursor-ring" data-state={ringState} />
        <svg width="44" height="44" viewBox="0 0 44 44" className="block overflow-visible">
          <g style={{ transformBox: 'view-box', transformOrigin: '22px 22px', transform: `scale(${armScale})`, transition: 'transform 180ms ease-out' }}>
            <line x1="2" y1="22" x2="13" y2="22" stroke={GOLD} strokeWidth="0.75" />
            <line x1="31" y1="22" x2="42" y2="22" stroke={GOLD} strokeWidth="0.75" />
            <line x1="22" y1="2" x2="22" y2="13" stroke={GOLD} strokeWidth="0.75" />
            <line x1="22" y1="31" x2="22" y2="42" stroke={GOLD} strokeWidth="0.75" />
          </g>
          <circle cx="22" cy="22" r="1.6" fill={CREAM} style={{ transformBox: 'view-box', transformOrigin: '22px 22px', transform: `scale(${dotScale})`, transition: 'transform 180ms ease-out' }} />
        </svg>
      </div>
    );
  }

  const innerClass = [
    'fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center',
    isClicking ? 'scale-75' : 'scale-100',
    variant === 'interactive' ? 'border-[#A9812E]' : 'border-[#14171F]',
    variant === 'text'
      ? 'w-[1px] h-[16px] bg-[#14171F] border-none'
      : 'w-[6px] h-[6px] border border-solid',
  ].join(' ');

  const outerClass = [
    'fixed top-0 left-0 pointer-events-none z-[9998] flex items-center justify-center rounded-[2px]',
    variant === 'interactive'
      ? 'w-[32px] h-[32px] border-[#A9812E] opacity-100 border border-solid'
      : variant === 'text'
        ? 'w-[12px] h-[12px] border-[#6B6F76] opacity-30 border border-solid'
        : variant === 'drop'
          ? 'w-[48px] h-[48px] border-[#A9812E] opacity-100 border border-dashed'
          : 'w-[22px] h-[22px] border-[#6B6F76] opacity-60 border border-solid',
  ].join(' ');

  return (
    <>
      <div ref={outerRef} className={outerClass}>
        {variant === 'drop' && (
          <span className="absolute left-[24px] top-[48px] whitespace-nowrap font-mono text-[10px] text-[#14171F]">
            Drop to upload
          </span>
        )}
      </div>
      <div ref={innerRef} className={innerClass}>
        {variant !== 'text' && <div className="h-[2px] w-[2px] bg-[#14171F]" />}
      </div>
    </>
  );
}
