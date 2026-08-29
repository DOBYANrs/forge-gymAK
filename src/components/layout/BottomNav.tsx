import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Today', icon: '🏋️' },
  { to: '/schedule', label: 'Schedule', icon: '📋' },
  { to: '/social', label: 'Social', icon: '🔥' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/body', label: 'Body', icon: '⚖️' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 safe-area-bottom z-50"
      style={{
        background: 'linear-gradient(135deg, rgba(15,15,26,0.95), rgba(22,22,40,0.9))',
        borderTop: '1px solid rgba(255,94,0,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }: { isActive: boolean }) => `
              flex flex-col items-center justify-center px-3 py-1 rounded-lg min-w-0
              transition-all duration-200 relative
              ${isActive ? 'scale-105' : 'opacity-50 hover:opacity-75'}
            `}
            style={({ isActive }: { isActive: boolean }) => ({
              color: isActive ? '#FF5E00' : 'rgba(148,163,184,0.5)',
            })}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
              {tab.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
