import React from 'react';
import '../styles/AnimatedButton.scss';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ children, className, ...props }) => {
  return (
    <button className={`animated-button ${className || ''}`} {...props}>
      <span className="icon">🔄</span>
      <span className="text">{children}</span>
    </button>
  );
};

export default AnimatedButton;