import { useState } from 'react';
import { ExternalLink, Github } from 'lucide-react';

const projects = [
  {
    id: 1,
    title: "E-Commerce Platform",
    description: "A full-featured e-commerce platform with product management, cart functionality, and secure checkout process.",
    image: "",
    tags: ["React", "Node.js", "MongoDB", "Stripe"],
    demoLink: "https://example.com",
    codeLink: "https://github.com"
  },
  {
    id: 2,
    title: "Task Management App",
    description: "A collaborative task management application with real-time updates, file sharing, and team communication features.",
    image: "",
    tags: ["React", "Firebase", "Material UI", "Redux"],
    demoLink: "https://example.com",
    codeLink: "https://github.com"
  },
  {
    id: 3,
    title: "Health & Fitness Tracker",
    description: "A comprehensive health tracking app that monitors activities, nutrition, and provides personalized insights.",
    image: "",
    tags: ["React Native", "GraphQL", "Node.js", "MongoDB"],
    demoLink: "",
    codeLink: ""
  },
  {
    id: 4,
    title: "Real Estate Platform",
    description: "A property listing and search platform with advanced filtering, map integration, and virtual tours.",
    image: "",
    tags: ["Vue.js", "Express", "PostgreSQL", "Google Maps API"],
    demoLink: "",
    codeLink: ""
  }
];

const fallbackImage = "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800";

const Projects = () => {
  const [activeProject, setActiveProject] = useState<number | null>(null);

  return (
    <section id="projects" className="py-24 bg-gradient-to-br from-[#0F1535] via-[#1A225A] to-[#221F67] text-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🚀 Featured Projects</h2>
            <p className="text-purple-200 max-w-2xl mx-auto text-lg">
              A collection of modern web apps built for performance and creativity.
            </p>
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-purple-500/10 hover:shadow-xl hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02]"
                onMouseEnter={() => setActiveProject(project.id)}
                onMouseLeave={() => setActiveProject(null)}
              >
                {/* Project Image */}
                <div className="relative h-60 overflow-hidden bg-[#1A1A2E]">
                  <img
                    src={project.image || fallbackImage}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A225A] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <div className="flex space-x-3">
                      {project.demoLink ? (
                        <a
                          href={project.demoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full flex items-center transition"
                        >
                          <ExternalLink size={16} className="mr-1" />
                          Live Demo
                        </a>
                      ) : (
                        <span className="bg-white/10 text-white px-4 py-2 rounded-full text-sm">
                          Coming soon...
                        </span>
                      )}
                      {project.codeLink ? (
                        <a
                          href={project.codeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500 text-purple-200 px-4 py-2 rounded-full flex items-center transition"
                        >
                          <Github size={16} className="mr-1" />
                          View Code
                        </a>
                      ) : (
                        <span className="bg-white/10 text-purple-300 px-4 py-2 rounded-full text-sm">
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-6">
                  <h3 className="text-2xl font-semibold mb-2">{project.title}</h3>
                  <p className="text-purple-100 mb-4">{project.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-purple-500/10 text-purple-300 px-3 py-1 text-sm rounded-full hover:scale-105 transition-all duration-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* GitHub CTA */}
          <div className="text-center mt-16">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-purple-400 hover:text-purple-300 font-medium transition-all"
            >
              View more projects on GitHub
              <ExternalLink size={16} className="ml-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Projects;
