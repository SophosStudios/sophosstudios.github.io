import { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Pricing from './components/Pricing';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import './utils/animations.css';

function App() {
  useEffect(() => {
    document.title = "SophosWRLD";
  }, []);

  return (
    <div className="font-sans bg-[#2B3A67] min-h-screen relative overflow-hidden">
      {/* Geometric Background */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2B3A67] via-[#4F6D7A] to-[#1B2A4A] animate-gradient"></div>
        
        {/* Geometric shapes */}
        <div className="absolute inset-0">
          {/* Triangle */}
          <div className="geometric-shape w-96 h-96 -left-20 top-1/4 bg-gradient-to-r from-[#E8DAB2]/30 to-[#4F6D7A]/30 animate-rotate" 
               style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}></div>
          
          {/* Hexagon */}
          <div className="geometric-shape w-80 h-80 right-20 top-1/3 bg-gradient-to-br from-[#4F6D7A]/40 to-[#2B3A67]/40 animate-float-slow"
               style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}></div>
          
          {/* Pentagon */}
          <div className="geometric-shape w-64 h-64 left-1/3 bottom-1/4 bg-gradient-to-tr from-[#E8DAB2]/20 to-[#2B3A67]/20 animate-pulse-scale"
               style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}></div>
        </div>

        {/* Overlay gradient for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#2B3A67]/50 to-[#2B3A67]/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <About />
          <Projects />
          <Skills />
          <Pricing />
          <Testimonials />
          <Contact />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App