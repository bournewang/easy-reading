'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { defaultServices } from '../services/defaultServices';
import type { SharedServices } from '../types/services';

const SharedServicesContext = createContext<SharedServices>(defaultServices);

interface SharedServicesProviderProps {
  children: React.ReactNode;
  services?: Partial<SharedServices>;
}

export function SharedServicesProvider({
  children,
  services,
}: SharedServicesProviderProps) {
  const value = useMemo(
    () => ({
      ...defaultServices,
      ...services,
    }),
    [services],
  );

  return (
    <SharedServicesContext.Provider value={value}>
      {children}
    </SharedServicesContext.Provider>
  );
}

export function useSharedServices() {
  return useContext(SharedServicesContext);
}
