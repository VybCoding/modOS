'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type TimeFrame = '7d' | '30d' | '90d';

interface SettingsContextType {
  timeFrame: TimeFrame;
  setTimeFrame: (timeFrame: TimeFrame) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('30d');

  return (
    <SettingsContext.Provider value={{ timeFrame, setTimeFrame }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
