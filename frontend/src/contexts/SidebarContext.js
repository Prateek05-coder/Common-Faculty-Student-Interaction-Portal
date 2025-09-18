import React, { useState, useContext, createContext } from 'react';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

  const closeSidebar = () => {
    setIsCollapsed(true);
    localStorage.setItem('sidebarCollapsed', 'true');
  };

  const openSidebar = () => {
    setIsCollapsed(false);
    localStorage.setItem('sidebarCollapsed', 'false');
  };

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // Auto-collapse on mobile
      if (mobile && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed]);

  const value = {
    isCollapsed,
    isMobile,
    toggleSidebar,
    closeSidebar,
    openSidebar
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};