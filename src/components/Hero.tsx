import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section 
      id="home" 
      className="min-h-screen flex items-center relative overflow-hidden bg-gradient-to-br from-[#0F1535] via-[#1A225A] to-[#221F67]"
    >
      {/* 🔷 Geometric Gradient Shapes */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-gradient-to-r from-purple-700 via-purple-900 to-black opacity-20 rounded-full animate-pulse top-10 left-10 blur-3xl" />
        <div className="absolute w-72 h-72 bg-gradient-to-br from-indigo-600 to-purple-600 opacity-20 rounded-full animate-ping bottom-20 right-20 blur-2xl" />
        <div className="absolute w-64 h-64 border border-purple-700 opacity-10 animate-spin-slow rounded-full top-[40%] left-[45%]" />
        <div className="absolute w-48 h-48 bg-gradient-to-r from-purple-400 to-purple-600 opacity-10 blur-2xl animate-bounce-slow rounded-full top-0 right-[20%]" />
      </div>

      {/* 🔮 Hero Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          <div className={`transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="text-sm text-purple-300 mb-4 font-medium">Start</div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
              Hi, my name is <span className="text-purple-400">PredZen</span>
            </h1>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-gray-300 italic">i design</span> 
              <span className="text-white"> and develop websites</span>
            </h2>

            <p className="text-lg text-gray-300 mb-8">
              Let me show You...
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#projects" 
                className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center group"
              >
                View Projects
                <ArrowRight size={18} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#contact" 
                className="bg-transparent border-2 border-purple-500/20 text-purple-300 hover:bg-purple-500/10 px-8 py-4 rounded-full font-medium transition-colors duration-300"
              >
                Contact Me
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
