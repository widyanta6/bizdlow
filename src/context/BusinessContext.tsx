import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Business, PeriodFilter } from '../types/index';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface BusinessContextType {
  businesses: Business[];
  activeBusiness: Business | null;
  loading: boolean;
  setActiveBusiness: (business: Business) => void;
  setActiveBusinessId: (id: string) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (p: PeriodFilter) => void;
  startDate: string;
  endDate: string;
  setDateRange: (start: string, end: string) => void;
  refreshBusinesses: () => Promise<void>;
  financialSummary: any;
  summaryLoading: boolean;
  refreshSummary: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusinessState] = useState<Business | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);

  const fetchBusinesses = useCallback(async () => {
    if (!user) {
      setBusinesses([]);
      setActiveBusinessState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await api.getBusinesses();
      setBusinesses(list);
      const savedId = localStorage.getItem('bizflow_active_business_id');
      const found = list.find((b) => b.id === savedId) || list[0] || null;
      setActiveBusinessState(found);
      if (found) {
        localStorage.setItem('bizflow_active_business_id', found.id);
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const fetchSummary = useCallback(async () => {
    if (!activeBusiness) {
      setFinancialSummary(null);
      return;
    }
    setSummaryLoading(true);
    try {
      const s = await api.getFinancialSummary(
        activeBusiness.id,
        periodFilter,
        periodFilter === 'custom' ? startDate : undefined,
        periodFilter === 'custom' ? endDate : undefined
      );
      setFinancialSummary(s);
    } catch (err) {
      console.error('Failed to load financial summary:', err);
      setFinancialSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [activeBusiness, periodFilter, startDate, endDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const setActiveBusiness = (biz: Business) => {
    setActiveBusinessState(biz);
    localStorage.setItem('bizflow_active_business_id', biz.id);
  };

  const setActiveBusinessId = (id: string) => {
    const found = businesses.find((b) => b.id === id);
    if (found) {
      setActiveBusiness(found);
    }
  };

  const setDateRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setPeriodFilter('custom');
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        loading,
        setActiveBusiness,
        setActiveBusinessId,
        periodFilter,
        setPeriodFilter,
        startDate,
        endDate,
        setDateRange,
        refreshBusinesses: fetchBusinesses,
        financialSummary,
        summaryLoading,
        refreshSummary: fetchSummary,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within a BusinessProvider');
  return context;
};
