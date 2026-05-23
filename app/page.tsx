import { Navbar } from '@/components/navbar'
import { HeroSection } from '@/components/hero'
import { FeaturesSection } from '@/components/features'
import { OptimizerDemo } from '@/components/optimizer-demo'
import { AnalyticsSection } from '@/components/analytics'
import { ArchitectureSection } from '@/components/architecture'
import { Footer } from '@/components/footer'

export default function Page() {
  return (
    <main className="overflow-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <OptimizerDemo />
      <AnalyticsSection />
      <ArchitectureSection />
      <Footer />
    </main>
  )
}
