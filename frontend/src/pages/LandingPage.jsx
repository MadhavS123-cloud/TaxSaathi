import React, { Suspense } from 'react';
import Nav from '../components/marketing/Nav';
import Hero from '../components/marketing/Hero';
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper font-sans text-ink relative overflow-hidden z-0">
      <BrandWatermark opacity={0.03} position="bottom-right" />
      <Nav />
      
      <main>
        <Hero />
        
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
