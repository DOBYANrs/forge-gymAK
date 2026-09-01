import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import SwipeNavigator from './SwipeNavigator';
import RestTimerPopup from '../today/RestTimerPopup';

export default function AppShell() {
  return (
    <div className="min-h-screen pb-20"
      style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 30%, #16213e 60%, #0f0f1a 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Decorative gold glow blobs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none animate-glowPulse"
        style={{ background: 'radial-gradient(circle, rgba(255,94,0,0.06), transparent 70%)' }}
      />
      <div className="fixed bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,94,0,0.04), transparent 70%)' }}
      />
      <div className="fixed top-1/2 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)' }}
      />

      <div className="relative z-10">
        <Header />
        <main className="max-w-lg mx-auto px-4 py-4">
          <SwipeNavigator>
            <Outlet />
          </SwipeNavigator>
        </main>
        <BottomNav />
        <RestTimerPopup />
      </div>
    </div>
  );
}
