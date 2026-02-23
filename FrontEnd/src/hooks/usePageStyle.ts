import { useEffect } from 'react';

const usePageStyle = (href) => {
  useEffect(() => {
    
    if (document.querySelector(`link[href="${href}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);

    
    return () => {
      const existingLink = document.querySelector(`link[href="${href}"]`);
      if (existingLink) {
        document.head.removeChild(existingLink);
      }
    };
  }, [href]);
};

export default usePageStyle;
