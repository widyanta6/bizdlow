import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { HomePage } from './components/pages/HomePage';
import { BusinessesPage } from './components/pages/BusinessesPage';
import { OrdersCalendarPage } from './components/pages/OrdersCalendarPage';
import { MyFilesPage } from './components/pages/MyFilesPage';
import { FinancialManagementPage } from './components/pages/FinancialManagementPage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { AiAssistantPage } from './components/pages/AiAssistantPage';
import { PersonalBlogPage } from './components/pages/PersonalBlogPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { LoginPage } from './components/auth/LoginPage';
import { ExcelExportModal } from './components/common/ExcelExportModal';
import { AiFloatingDrawer } from './components/ai/AiFloatingDrawer';

function MainApp() {
  const { user, loading } = useAuth();
  const { activeBusiness } = useBusiness();

  // Route state initialized from window.location.hash (PRD Section 3)
  const getInitialTab = (): NavItemKey => {
    const hash = window.location.hash.replace('#/', '').split('?')[0];
    const validTabs: NavItemKey[] = [
      'home',
      'businesses',
      'orders',
      'files',
      'finance',
      'analytics',
      'ai',
      'blog',
      'settings',
    ];
    if (validTabs.includes(hash as NavItemKey)) {
      return hash as NavItemKey;
    }
    return 'home';
  };

  const [currentTab, setCurrentTab] = useState<NavItemKey>(getInitialTab);
  const [showExportModal, setShowExportModal] = useState(false);

  // Sync route changes to hash
  const handleNavigate = (tab: NavItemKey) => {
    setCurrentTab(tab);
    window.location.hash = `#/${tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').split('?')[0];
      const validTabs: NavItemKey[] = [
        'home',
        'businesses',
        'orders',
        'files',
        'finance',
        'analytics',
        'ai',
        'blog',
        'settings',
      ];
      if (validTabs.includes(hash as NavItemKey)) {
        setCurrentTab(hash as NavItemKey);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold animate-pulse">
            BF
          </div>
          <p className="text-xs font-semibold text-slate-500">Memuat BizFlow Multi-Brand...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const pageTitles: Record<NavItemKey, string> = {
    home: 'Workspace Dashboard',
    businesses: 'My Businesses',
    orders: 'Orders & Calendar',
    files: 'My Files (Cloud Storage)',
    finance: 'Financial Management',
    analytics: 'Analytics & Performance',
    ai: 'BizFlow AI Assistant',
    blog: 'Personal Blog',
    settings: 'Pengaturan & Keamanan',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF4FE] via-[#F4F1FD] to-[#FCF5FF] flex font-sans text-slate-900 antialiased selection:bg-sky-200">
      {/* Global Sidebar (PRD Section 3 & 6.2) */}
      <Sidebar currentTab={currentTab} onNavigate={handleNavigate} storageUsageMb={7.8} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          pageTitle={pageTitles[currentTab]}
          onOpenExportModal={() => setShowExportModal(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'home' && (
            <HomePage
              onNavigate={handleNavigate}
              onOpenNewOrderModal={() => handleNavigate('orders')}
              onOpenNewTransactionModal={() => handleNavigate('finance')}
              onOpenFileUploadModal={() => handleNavigate('files')}
            />
          )}
          {currentTab === 'businesses' && <BusinessesPage />}
          {currentTab === 'orders' && <OrdersCalendarPage />}
          {currentTab === 'files' && (
            <MyFilesPage onNavigateToOrders={() => handleNavigate('orders')} />
          )}
          {currentTab === 'finance' && <FinancialManagementPage />}
          {currentTab === 'analytics' && <AnalyticsPage />}
          {currentTab === 'ai' && <AiAssistantPage onNavigate={handleNavigate} />}
          {currentTab === 'blog' && <PersonalBlogPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Floating AI Assistant Drawer (when not on Home page, since Home page has the docked AI Assistant matching mockup) */}
      {currentTab !== 'home' && <AiFloatingDrawer onOpenFullPage={() => handleNavigate('ai')} />}

      {/* Excel Export Modal */}
      <ExcelExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <MainApp />
      </BusinessProvider>
    </AuthProvider>
  );
}
