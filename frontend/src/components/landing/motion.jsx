import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

export const ease = [0.22, 1, 0.36, 1];

export function useCalm() {
  return useReducedMotion() === true;
}

export function Reveal({ children, className = '', delay = 0, y = 32 }) {
  const calm = useCalm();
  return (
    <motion.div
      className={className}
      initial={calm ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={calm ? { duration: 0 } : { duration: 0.85, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className = '', gap = 0.12 }) {
  const calm = useCalm();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-12% 0px' }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: calm ? 0 : gap, delayChildren: calm ? 0 : 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Item({ children, className = '' }) {
  const calm = useCalm();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: calm ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: calm ? 0 : 0.75, ease },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function GoldLine({ className = '' }) {
  const calm = useCalm();
  return (
    <motion.div
      className={`h-px origin-left bg-[#C9A96E] ${className}`}
      initial={calm ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: calm ? 0 : 1.15, ease }}
    />
  );
}

export function CountUp({ to, suffix = '', className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const calm = useCalm();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (calm) {
      setValue(to);
      return undefined;
    }
    let start;
    let frame;
    const duration = 1400;
    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(eased * to));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, calm, to]);

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  );
}
