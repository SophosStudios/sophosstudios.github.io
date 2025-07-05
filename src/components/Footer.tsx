import { Heart, Linkedin, Twitter, Github } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <a 
                href="#home" 
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent"
              >
                Portfolio
              </a>
              <p className="text-gray-400 mt-2 max-w-md">
                Creating digital experiences that blend aesthetics with functionality,
                delivering solutions that exceed expectations.
              </p>
            </div>
            
            <div className="flex space-x-8">
              <div>
                <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li><a href="#home" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                  <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                  <li><a href="#projects" className="text-gray-400 hover:text-white transition-colors">Projects</a></li>
                  <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Connect</h4>
                <div className="flex space-x-4">
                  <a 
                    href="https://github.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors"
                    aria-label="GitHub"
                  >
                    <Github size={20} />
                  </a>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin size={20} />
                  </a>
                  <a 
                    href="https://twitter.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter size={20} />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500">
              &copy; {currentYear} PredZen. All rights reserved.
            </p>
            
            <p className="flex items-center text-gray-500 mt-4 md:mt-0">
              Made with <Heart size={16} className="mx-1 text-red-500" /> by PredZen.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;