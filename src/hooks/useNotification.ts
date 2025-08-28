
import { useState, useEffect } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string) => {
    setNotification(message);
  };

  return { notification, showNotification };
};
