import React, { useState, useRef, useEffect } from 'react';
import '../styles/CustomDropdown.scss';

interface Props {
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const CustomDropdown: React.FC<Props> = ({ options, selectedValue, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: string) => {
    onSelect(option);
    setIsOpen(false);
  };

  // Hook to close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`custom-dropdown ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
      <div className="dropdown-selected" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedValue}</span>
        <span className="chevron"></span>
      </div>
      {isOpen && (
        <ul className="dropdown-options">
          {options.map(option => (
            <li 
              key={option} 
              className={option === selectedValue ? 'selected' : ''} 
              onClick={() => handleSelect(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
