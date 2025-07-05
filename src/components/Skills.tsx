import { useState } from 'react';

interface Skill {
  name: string;
  level: number;
  color: string;
}

interface SkillCategory {
  title: string;
  skills: Skill[];
}

const skillCategories: SkillCategory[] = [
  {
    title: "Frontend Development",
    skills: [
      { name: "HTML/CSS", level: 95, color: "bg-purple-500" },
      { name: "JavaScript", level: 90, color: "bg-purple-500" },
      { name: "React", level: 92, color: "bg-purple-500" },
      { name: "Vue.js", level: 85, color: "bg-purple-500" },
      { name: "Tailwind CSS", level: 90, color: "bg-purple-500" },
    ]
  },
  {
    title: "Backend Development",
    skills: [
      { name: "Node.js", level: 88, color: "bg-indigo-500" },
      { name: "Python", level: 80, color: "bg-indigo-500" },
      { name: "Express", level: 85, color: "bg-indigo-500" },
      { name: "GraphQL", level: 78, color: "bg-indigo-500" },
      { name: "MongoDB", level: 82, color: "bg-indigo-500" },
    ]
  },
  {
    title: "Design & Tools",
    skills: [
      { name: "Figma", level: 90, color: "bg-pink-500" },
      { name: "Adobe XD", level: 85, color: "bg-pink-500" },
      { name: "Photoshop", level: 75, color: "bg-pink-500" },
      { name: "Git", level: 88, color: "bg-pink-500" },
      { name: "Docker", level: 72, color: "bg-pink-500" },
    ]
  }
];

const Skills = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isAnimated, setIsAnimated] = useState<Record<number, boolean>>({});

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    setTimeout(() => {
      setIsAnimated({ ...isAnimated, [index]: true });
    }, 100);
  };

  return (
    <section id="skills" className="py-24 bg-gradient-to-br from-[#0F1535] via-[#1A225A] to-[#221F67] text-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🧠 Skills & Expertise</h2>
            <p className="text-purple-200 max-w-2xl mx-auto text-lg">
              An overview of my technical capabilities and tools I excel in.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-10">
            {/* Sidebar */}
            <div className="md:w-1/3">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg sticky top-24 border border-purple-500/10">
                <h3 className="text-xl font-semibold mb-6">📂 Skill Categories</h3>
                <div className="space-y-2">
                  {skillCategories.map((category, index) => (
                    <button
                      key={index}
                      className={`w-full text-left p-4 rounded-lg transition-all duration-300 ${
                        activeTab === index
                          ? 'bg-purple-600/90 text-white shadow-md'
                          : 'hover:bg-white/10 text-purple-200'
                      }`}
                      onClick={() => handleTabChange(index)}
                    >
                      <span className="font-medium">{category.title}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-8 p-4 bg-white/5 rounded-lg text-purple-200 text-sm">
                  📘 I’m always learning and improving through real-world projects.
                </div>
              </div>
            </div>

            {/* Skills Display */}
            <div className="md:w-2/3">
              {skillCategories.map((category, categoryIndex) => (
                <div
                  key={categoryIndex}
                  className={`transition-opacity duration-300 ${
                    activeTab === categoryIndex ? 'block opacity-100' : 'hidden opacity-0'
                  }`}
                >
                  <h3 className="text-2xl font-semibold mb-8">{category.title}</h3>

                  <div className="space-y-6">
                    {category.skills.map((skill, skillIndex) => (
                      <div key={skillIndex} className="mb-6">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{skill.name}</span>
                          <span className="text-purple-300">{skill.level}%</span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${skill.color} transition-all duration-1000 ease-out ${
                              isAnimated[activeTab] ? '' : 'w-0'
                            }`}
                            style={{ width: isAnimated[activeTab] ? `${skill.level}%` : '0%' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;
