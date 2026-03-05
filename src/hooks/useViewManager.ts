import { useState, useEffect } from 'react';

export type View = 'inventory' | 'withdrawn' | 'blacklist';

export const useViewManager = (initialView: View) => {
  const [view, setView] = useState<View>(initialView);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            setView('inventory');
            break;
          case '2':
            setView('withdrawn');
            break;
          case '3':
            setView('blacklist');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { view, setView };
};
