import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionSkeleton from '../components/marketing/SectionSkeleton';
import BrandWatermark from '../components/ui/BrandWatermark';

// Use lazy loading for below-the-fold sections
const StatsStrip = React.lazy(() => import('../components/marketing/StatsStrip'));
const AiAssistsSection = React.lazy(() => import('../components/marketing/AiAssistsSection'));
const ProductPreviewSection = React.lazy(() => import('../components/marketing/ProductPreviewSection'));
const GrowthStageStrip = React.lazy(() => import('../components/marketing/GrowthStageStrip'));
const HowItWorksSection = React.lazy(() => import('../components/marketing/HowItWorksSection'));
const TrustSection = React.lazy(() => import('../components/marketing/TrustSection'));
const TestimonialSection = React.lazy(() => import('../components/marketing/TestimonialSection'));
const LogoMarquee = React.lazy(() => import('../components/marketing/LogoMarquee'));
const FinalCta = React.lazy(() => import('../components/marketing/FinalCta'));
const Footer = React.lazy(() => import('../components/marketing/Footer'));

const BoomerangVideoBg = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const requestRef = useRef(null);
  const lastTimeRef = useRef(-1);
  const [framesReady, setFramesReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let captureActive = true;

    const captureFrame = () => {
      if (!captureActive || !video) return;
      
      const currentTime = video.currentTime;
      if (currentTime !== lastTimeRef.current && video.videoWidth > 0) {
        lastTimeRef.current = currentTime;
        
        const canvas = document.createElement('canvas');
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > 960) {
          height = (960 / width) * height;
          width = 960;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          framesRef.current.push(canvas);
        }
      }
      
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    const onPlay = () => {
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    const onEnded = () => {
      captureActive = false;
      if (framesRef.current.length > 0) {
        setFramesReady(true);
        startBoomerang();
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('ended', onEnded);

    video.play().catch(e => console.error("Video play failed", e));

    return () => {
      captureActive = false;
      video.removeEventListener('play', onPlay);
      video.removeEventListener('ended', onEnded);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startBoomerang = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const frames = framesRef.current;
    if (frames.length === 0) return;

    canvas.width = frames[0].width;
    canvas.height = frames[0].height;

    let frameIndex = frames.length - 1;
    let direction = -1;
    let lastDrawTime = performance.now();
    const fpsInterval = 1000 / 30;

    const render = (time) => {
      requestRef.current = requestAnimationFrame(render);
      
      const elapsed = time - lastDrawTime;
      if (elapsed > fpsInterval) {
        lastDrawTime = time - (elapsed % fpsInterval);
        
        ctx.drawImage(frames[frameIndex], 0, 0);
        
        frameIndex += direction;
        
        if (frameIndex >= frames.length - 1) {
          frameIndex = frames.length - 1;
          direction = -1;
        } else if (frameIndex <= 0) {
          frameIndex = 0;
          direction = 1;
        }
      }
    };

    requestRef.current = requestAnimationFrame(render);
  };

  return (
    <div className="absolute inset-0 z-0 scale-[1.15] origin-top overflow-hidden">
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4"
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="w-full h-full object-cover object-top"
        style={{ display: framesReady ? 'none' : 'block' }}
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover object-top"
        style={{ display: framesReady ? 'block' : 'none' }}
      />
    </div>
  );
};

export default function LandingPage() {
  const navigate = useNavigate();

  const smoothScrollTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#191919] relative overflow-x-hidden z-0">
      <BrandWatermark opacity={0.03} position="bottom-right" />
      
      {/* Custom Transparent Nav matching Boomerang layout but with CA Tax Copilot text */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-[#191919] text-white flex items-center justify-center font-serif font-bold text-xs rounded-sm">
            TS
          </div>
          <span className="font-semibold text-base tracking-tight text-[#191919]">CA Tax Copilot</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          {['Product', 'How it works', 'Security'].map((item) => {
            const id = item === 'Product' ? 'pipelines' : item.toLowerCase().replace(/ /g, '-');
            return (
              <a 
                key={item} 
                href={`#${id}`}
                onClick={smoothScrollTo(id)}
                className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
              >
                {item}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-6">
          <Link to="/login" className="hidden sm:block text-sm font-sans text-[#191919] hover:text-[#191919]/70 transition-colors">
            Sign in
          </Link>
          <button 
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200"
          >
            Request a demo
          </button>
        </div>
      </nav>

      <main>
        {/* Full Viewport Boomerang Hero with CA Tax Copilot text */}
        <section className="relative flex flex-col items-center overflow-hidden h-screen">
          <BoomerangVideoBg />
          
          <div className="relative z-10 flex flex-col items-center text-center pt-24 sm:pt-26 md:pt-32 px-4 sm:px-6 w-full flex-1">
            <div className="border border-[#191919]/20 px-3 py-1 mb-6 text-[10px] sm:text-xs font-mono tracking-widest uppercase text-[#191919]/70 bg-white/50 backdrop-blur-sm rounded-sm">
              Built for Indian CA practices
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-7xl leading-[1.1] tracking-tighter text-[#191919] font-normal max-w-4xl mx-auto">
              Pre-accounting and tax advisory, handled before your first coffee.
            </h1>
            
            <p className="max-w-md sm:max-w-xl mt-5 sm:mt-6 md:mt-8 text-sm md:text-lg text-[#191919]/70 leading-relaxed">
              Automate invoice data extraction, ledger reconciliation, and plain-language client drafting with an audit-ready pipeline.
            </p>
            
            <button 
              onClick={() => navigate('/login')}
              className="mt-6 sm:mt-8 md:mt-10 px-6 sm:px-8 py-3 sm:py-3.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200"
            >
              Request a demo
            </button>
          </div>

          <div className="relative z-10 w-full max-w-5xl px-4 sm:px-6 mt-auto">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 border-b-0 pt-8 sm:pt-12 md:pt-16 px-5 sm:px-8 md:px-12 pb-0 shadow-sm">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-16">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium">
                    What do we do?
                  </div>
                  <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-serif font-normal leading-tight tracking-tight text-[#191919]">
                    Conversations that<br className="hidden sm:block" /> build momentum
                  </h2>
                </div>
                <div className="flex items-end">
                  <p className="text-sm md:text-[15px] text-[#191919]/70 leading-relaxed">
                    Conversational AI built for regulated financial institutions. Agents that hold a real conversation, plug into the systems you run, and show their work.
                  </p>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 md:mt-10 h-px bg-gray-200 w-full"></div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-6">
                {[
                  { num: '01', label: 'Conversational' },
                  { num: '02', label: 'Connected' },
                  { num: '03', label: 'Compliant' }
                ].map((item) => (
                  <div 
                    key={item.num}
                    className="group bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center"
                  >
                    <div className="flex items-center text-sm md:text-base">
                      <span className="text-[#191919]/40">{item.num}</span>
                      <span className="mx-2 text-[#191919]/30">/</span>
                      <span className="font-medium text-[#191919]">{item.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>
        
        {/* Lazy load the rest of the original landing page components below the full viewport hero */}
        <Suspense fallback={<SectionSkeleton heightClass="h-[150px]" />}>
          <StatsStrip />
        </Suspense>

        <Suspense fallback={<SectionSkeleton heightClass="h-[500px]" />}>
          <AiAssistsSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton heightClass="h-[600px]" />}>
          <ProductPreviewSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton heightClass="h-[300px]" />}>
          <GrowthStageStrip />
        </Suspense>

        <Suspense fallback={<SectionSkeleton heightClass="h-[400px]" />}>
          <HowItWorksSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton heightClass="h-[300px]" />}>
          <TrustSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton heightClass="h-[400px]" />}>
          <TestimonialSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton heightClass="h-[150px]" />}>
          <LogoMarquee />
        </Suspense>

        <Suspense fallback={<SectionSkeleton heightClass="h-[400px]" />}>
          <FinalCta />
        </Suspense>
      </main>

      <Suspense fallback={<SectionSkeleton heightClass="h-[300px]" />}>
        <Footer />
      </Suspense>
    </div>
  );
}
