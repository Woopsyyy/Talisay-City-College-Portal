import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { subscribeToApiLoading } from '../services/apiEvents';

type LoadingContextValue = {
  isLoading: boolean;
};

const LoadingContext = createContext<LoadingContextValue>({ isLoading: false });

const SHOW_DELAY_MS = 250;
const MIN_VISIBLE_MS = 420;
const HIDE_DELAY_MS = 120;
const MAX_VISIBLE_MS = 8000;

export const LoadingProvider = ({ children }: React.PropsWithChildren) => {
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const visibleSinceRef = useRef(0);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forceHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setLoadingVisibility = (next: boolean) => {
    isLoadingRef.current = next;
    setIsLoading((prev) => (prev === next ? prev : next));
  };

  useEffect(() => {
    const clearShowTimer = () => {
      if (!showTimerRef.current) return;
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    };

    const clearHideTimer = () => {
      if (!hideTimerRef.current) return;
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    };

    const clearForceHideTimer = () => {
      if (!forceHideTimerRef.current) return;
      clearTimeout(forceHideTimerRef.current);
      forceHideTimerRef.current = null;
    };

    const handleApiLoading = (active: boolean) => {
      if (active) {
        clearHideTimer();
        if (isLoadingRef.current || showTimerRef.current) return;

        showTimerRef.current = setTimeout(() => {
          showTimerRef.current = null;
          if (!isLoadingRef.current) {
            visibleSinceRef.current = Date.now();
            setLoadingVisibility(true);
            clearForceHideTimer();
            forceHideTimerRef.current = setTimeout(() => {
              forceHideTimerRef.current = null;
              clearShowTimer();
              clearHideTimer();
              setLoadingVisibility(false);
            }, MAX_VISIBLE_MS);
          }
        }, SHOW_DELAY_MS);
        return;
      }

      clearShowTimer();

      if (!isLoadingRef.current) {
        clearHideTimer();
        return;
      }

      clearHideTimer();
      const elapsed = Date.now() - visibleSinceRef.current;
      const waitMs = Math.max(0, MIN_VISIBLE_MS - elapsed) + HIDE_DELAY_MS;

      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        clearForceHideTimer();
        setLoadingVisibility(false);
      }, waitMs);
    };

    const unsubscribe = subscribeToApiLoading(handleApiLoading);

    return () => {
      if (unsubscribe) unsubscribe();
      clearShowTimer();
      clearHideTimer();
      clearForceHideTimer();
      setLoadingVisibility(false);
    };
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
