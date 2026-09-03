import { useState } from 'react';
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import CharacterSelectPage from './pages/CharacterSelectPage';
import { useUser } from './context/UserContext';
import type { UserId } from './types';

const TodayPage = lazy(() => import('./pages/TodayPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const BodyPage = lazy(() => import('./pages/BodyPage'));
const SocialPage = lazy(() => import('./pages/SocialPage'));
const RankingPage = lazy(() => import('./pages/RankingPage'));
const Muscle360Page = lazy(() => import('./pages/Muscle360Page'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { setActiveUser } = useUser();
  // Always show the character selector on a normal (re)load so the user can pick
  // who they are. But skip it right after a backup import, because the import
  // flow itself reloads the page and we don't want to bounce the user back to
  // the character-selection screen after restoring their data.
  const [showSelector, setShowSelector] = useState(() => {
    const justImported = sessionStorage.getItem('kasaint_gym_just_imported') === '1';
    sessionStorage.removeItem('kasaint_gym_just_imported');
    return !justImported;
  });

  const handleSelect = (user: UserId) => {
    setActiveUser(user);
    setShowSelector(false);
  };

  if (showSelector) {
    return <CharacterSelectPage onSelect={handleSelect} />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={
          <Suspense fallback={<PageLoader />}>
            <TodayPage />
          </Suspense>
        } />
        <Route path="schedule" element={
          <Suspense fallback={<PageLoader />}>
            <SchedulePage />
          </Suspense>
        } />
        <Route path="history" element={
          <Suspense fallback={<PageLoader />}>
            <HistoryPage />
          </Suspense>
        } />
        <Route path="progress" element={
          <Suspense fallback={<PageLoader />}>
            <ProgressPage />
          </Suspense>
        } />
        <Route path="body" element={
          <Suspense fallback={<PageLoader />}>
            <BodyPage />
          </Suspense>
        } />
        <Route path="social" element={
          <Suspense fallback={<PageLoader />}>
            <SocialPage />
          </Suspense>
        } />
        <Route path="ranking" element={
          <Suspense fallback={<PageLoader />}>
            <RankingPage />
          </Suspense>
        } />
        <Route path="muscle360" element={
          <Suspense fallback={<PageLoader />}>
            <Muscle360Page />
          </Suspense>
        } />
      </Route>
    </Routes>
  );
}

export default function App() {
  return <AppContent />;
}
