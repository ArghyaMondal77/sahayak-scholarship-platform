import Hero from '../components/Hero.jsx';
import SchemeMarquee from '../components/SchemeMarquee.jsx';
import BentoGrid from '../components/BentoGrid.jsx';
import StageCards from '../components/StageCards.jsx';

export default function Home() {
  return (
    <div className="mx-auto flex w-[94%] max-w-[1400px] flex-col gap-16 px-4 pb-16 pt-6 sm:px-6 md:gap-20 md:pt-10">
      <Hero />
      <SchemeMarquee />
      <BentoGrid />
      <StageCards />
    </div>
  );
}
