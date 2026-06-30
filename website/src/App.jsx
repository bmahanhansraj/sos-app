import Nav from './components/Nav';
import Hero from './components/Hero';
import LiveStats from './components/LiveStats';
import ServicesGrid from './components/ServicesGrid';
import HowItWorks from './components/HowItWorks';
import Cities from './components/Cities';
import PartnerCTA from './components/PartnerCTA';
import DownloadSection from './components/DownloadSection';
import Footer from './components/Footer';
import FloatingAppBadges from './components/AppBadges';

export default function App() {
  return (
    <div className="min-h-screen bg-void">
      <Nav />
      <main>
        <Hero />
        <LiveStats />
        <ServicesGrid />
        <HowItWorks />
        <Cities />
        <PartnerCTA />
        <DownloadSection />
      </main>
      <Footer />
      <FloatingAppBadges />
    </div>
  );
}
