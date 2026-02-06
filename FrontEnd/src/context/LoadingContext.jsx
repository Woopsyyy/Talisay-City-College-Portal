import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { subscribeToApiLoading } from '../services/api';

const LoadingContext = createContext({ isLoading: false });

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToApiLoading((active) => {
      if (active) {
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            setIsLoading(true);
            timerRef.current = null;
          }, 250);
        }
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsLoading(false);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
