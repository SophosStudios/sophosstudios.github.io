import { User, Code, Palette, Globe } from 'lucide-react';

const About = () => {
  return (
    <section id="about" className="py-24 bg-gradient-to-br from-[#0F1535] via-[#1A225A] to-[#221F67] text-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          
          {/* Left Image Section */}
          <div className="relative">
            <img 
              src="https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=800" 
              alt="Profile"
              className="rounded-3xl w-full h-auto object-cover shadow-lg border border-purple-600/30"
            />
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full animate-ping" />
          </div>

          {/* Right Text Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight tracking-tight">
                👋 About <span className="text-purple-400">Me</span>
              </h2>
              <p className="text-purple-100 text-lg leading-relaxed">
                I'm a creative full-stack developer and designer with over 5 years of experience building clean, functional, and user-friendly websites and apps. I turn ideas into beautiful digital products with precision and passion.
              </p>
            </div>

            {/* Skill Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: <Code size={24} />, title: "Web Development", desc: "Crafting high-performing websites" },
                { icon: <Palette size={24} />, title: "UI/UX Design", desc: "Modern & user-focused interfaces" },
                { icon: <User size={24} />, title: "User-Centered", desc: "Prioritizing accessibility & flow" },
                { icon: <Globe size={24} />, title: "Global Clients", desc: "Delivering worldwide solutions" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="group bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-2xl p-5 flex items-start space-x-4 backdrop-blur-md border border-purple-500/10"
                >
                  <div className="p-3 rounded-lg bg-purple-600/20 text-purple-400 group-hover:bg-purple-600/30 transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">{item.title}</h4>
                    <p className="text-sm text-purple-200">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a 
              href="/resume.pdf" 
              className="inline-block mt-6 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition-all"
            >
              📄 Download Resume
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
