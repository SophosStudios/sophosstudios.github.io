import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#mobile-menu') && !target.closest('#mobile-menu-button')) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleContactClick = () => {
    const contactSection = document.querySelector('#contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <header 
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#111]/80 backdrop-blur-md' 
          : 'bg-transparent'
      } py-4`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <a 
            href="#home" 
            className="flex items-center space-x-2"
            aria-label="Go to home section"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-white rounded-full flex items-center">
              <div className="w-1/2 h-full bg-[#111] rounded-l-full"></div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {['Services', 'Portfolio', 'Experience', 'Pricing', 'Reviews'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-white hover:text-blue-300 transition-colors flex items-center space-x-1"
              >
                <span>{item}</span>
                <span className="text-xs">↗</span>
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={handleContactClick}
              className="bg-white hover:bg-gray-100 text-[#111] px-6 py-2 rounded-full font-medium transition-colors"
            >
              Contact me
            </button>
          </div>

          {/* Mobile menu button */}
          <button 
            id="mobile-menu-button"
            className="md:hidden p-2 text-white rounded-md hover:bg-white/10 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div 
            id="mobile-menu"
            className="md:hidden mt-4 bg-[#111]/95 backdrop-blur-lg rounded-lg p-4 absolute left-4 right-4"
          >
            <nav className="flex flex-col space-y-4">
              {['Services', 'Portfolio', 'Experience', 'Pricing', 'Reviews'].map((item) => (
                <a 
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-white hover:text-blue-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between"
                  onClick={() => setIsOpen(false)}
                >
                  <span>{item}</span>
                  <span className="text-xs">↗</span>
                </a>
              ))}
              
              <div className="pt-4 border-t border-white/10">
                <button 
                  onClick={handleContactClick}
                  className="w-full bg-white hover:bg-gray-100 text-[#111] px-6 py-2 rounded-full font-medium transition-colors"
                >
                  Contact me
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;