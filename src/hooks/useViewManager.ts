
import { useState, useEffect } from 'react';

export type View = 'produtos' | 'retirados' | 'blacklist';

export const useViewManager = (initialView: View) => {
  const [view, setView] = useState<View>(initialView);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            setView('produtos');
            break;
          case '2':
            setView('retirados');
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
