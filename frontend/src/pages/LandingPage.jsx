import { useEffect } from 'react';
import QuietLanding from '../components/landing/QuietLanding';

export default function LandingPage() {
  useEffect(() => {
    const root = document.documentElement;
    const previousRoot = root.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    const previousColor = document.body.style.color;
    root.style.backgroundColor = '#0C0C0C';
    document.body.style.backgroundColor = '#0C0C0C';
    document.body.style.color = '#F3EDE2';
    return () => {
      root.style.backgroundColor = previousRoot;
      document.body.style.backgroundColor = previousBody;
      document.body.style.color = previousColor;
    };
  }, []);

  return <QuietLanding />;
}
