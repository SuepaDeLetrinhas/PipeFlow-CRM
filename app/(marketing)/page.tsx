import { CallToAction } from "@/components/marketing/cta";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { Stats } from "@/components/marketing/stats";

export default function LandingPage() {
  return (
    <>
      <Hero />
      {/* Os números vêm logo depois da promessa do hero: é o que sustenta a
          headline antes de a página começar a listar recursos. */}
      <Stats />
      <Features />
      <Pricing />
      <CallToAction />
    </>
  );
}
