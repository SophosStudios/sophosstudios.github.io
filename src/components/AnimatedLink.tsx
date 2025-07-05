import React from 'react';

interface AnimatedLinkProps {
  href: string;
  children: React.ReactNode;
}

export const AnimatedLink: React.FC<AnimatedLinkProps> = ({ href, children }) => {
  return (
    <a 
      href={href} 
      className="relative text-white hover:text-blue-200 transition-colors group"
    >
      <span>{children}</span>
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
    </a>
  );
};