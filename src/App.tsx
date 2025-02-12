import React, { Suspense, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { PerformanceProfiler } from '@/utils/performance';
import { lazyRoute } from '@/utils/lazy-loading';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/error-boundary';

// Route components with standardized lazy loading
const routes = {
  Index: lazyRoute(() => import('@/pages/Index'), 'page-index'),
  Home: lazyRoute(() => import('@/pages/Home'), 'page-home'),
  Auth: lazyRoute(() => import('@/pages/Auth'), 'page-auth'),
  Profile: lazyRoute(() => import('@/pages/Profile'), 'page-profile'),
  Tools: lazyRoute(() => import('@/pages/Tools'), 'page-tools'),
  ToolPage: lazyRoute(() => import('@/pages/ToolPage'), 'page-tool-detail'),
  AINews: lazyRoute(() => import('@/pages/AINews'), 'page-ai-news'),
  SisoAI: lazyRoute(() => import('@/pages/SisoAI'), 'page-siso-ai'),
  ChatGPTAssistants: lazyRoute(() => import('@/pages/ChatGPTAssistants'), 'page-assistants'),
  Automations: lazyRoute(() => import('@/pages/Automations'), 'page-automations'),
  Networking: lazyRoute(() => import('@/pages/Networking'), 'page-networking'),
  Community: lazyRoute(() => import('@/pages/Community'), 'page-community'),
  LearnNetwork: lazyRoute(() => import('@/pages/LearnNetwork'), 'page-learn'),
  HowToEarn: lazyRoute(() => import('@/pages/HowToEarn'), 'page-earn'),
  Economy: lazyRoute(() => import('@/pages/Economy'), 'page-economy'),
  CryptoExchange: lazyRoute(() => import('@/pages/CryptoExchange'), 'page-exchange'),
  Crypto: lazyRoute(() => import('@/pages/Crypto'), 'page-crypto'),
  Leaderboards: lazyRoute(() => import('@/pages/Leaderboards'), 'page-leaderboards'),
  SisoEducation: lazyRoute(() => import('@/pages/SisoEducation'), 'page-education'),
  EducatorDetail: lazyRoute(() => import('@/pages/EducatorDetail'), 'page-educator'),
  VideoDetail: lazyRoute(() => import('@/pages/VideoDetail'), 'page-video'),
  Terms: lazyRoute(() => import('@/pages/Terms'), 'page-terms'),
  PrivacyPolicy: lazyRoute(() => import('@/pages/PrivacyPolicy'), 'page-privacy'),
  ThankYou: lazyRoute(() => import('@/pages/ThankYou'), 'page-thank-you'),
  SocialOnboarding: lazyRoute(() => import('@/pages/onboarding/social'), 'page-social-onboarding'),
};

function App() {
  const { checkAuth, initialized } = useAuthStore(state => ({
    checkAuth: state.checkAuth,
    initialized: state.initialized
  }));

  // Use useMemo to prevent unnecessary re-renders
  const profiledRoutes = useMemo(() => (
    <Routes>
      <Route path="/" element={<routes.Index />} />
      <Route path="/home" element={<routes.Home />} />
      <Route path="/auth" element={<routes.Auth />} />
      <Route path="/profile" element={<routes.Profile />} />
      <Route path="/tools" element={<routes.Tools />} />
      <Route path="/tools/:id" element={<routes.ToolPage />} />
      <Route path="/ai-news" element={<routes.AINews />} />
      <Route path="/siso-ai" element={<routes.SisoAI />} />
      <Route path="/assistants" element={<routes.ChatGPTAssistants />} />
      <Route path="/automations" element={<routes.Automations />} />
      <Route path="/networking" element={<routes.Networking />} />
      <Route path="/community" element={<routes.Community />} />
      <Route path="/learn" element={<routes.LearnNetwork />} />
      <Route path="/economy/earn" element={<routes.HowToEarn />} />
      <Route path="/earn" element={<routes.HowToEarn />} />
      <Route path="/economy" element={<routes.Economy />} />
      <Route path="/economy/crypto-exchange" element={<routes.CryptoExchange />} />
      <Route path="/exchange" element={<routes.CryptoExchange />} />
      <Route path="/crypto" element={<routes.Crypto />} />
      <Route path="/economy/leaderboards" element={<routes.Leaderboards />} />
      <Route path="/leaderboards" element={<routes.Leaderboards />} />
      <Route path="/education" element={<routes.SisoEducation />} />
      <Route path="/education/educators/:slug" element={<routes.EducatorDetail />} />
      <Route path="/education/videos/:id" element={<routes.VideoDetail />} />
      <Route path="/terms" element={<routes.Terms />} />
      <Route path="/privacy" element={<routes.PrivacyPolicy />} />
      <Route path="/thank-you" element={<routes.ThankYou />} />
      <Route path="/onboarding/social" element={<routes.SocialOnboarding />} />
    </Routes>
  ), []);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PerformanceProfiler id="App">
        {profiledRoutes}
      </PerformanceProfiler>
    </ErrorBoundary>
  );
}

export default App;
