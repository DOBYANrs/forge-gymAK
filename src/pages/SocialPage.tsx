import { useState, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import ActivityFeed from '../components/social/ActivityFeed';
import Leaderboard from '../components/social/Leaderboard';
import PRBadges from '../components/progress/PRBadges';
import BodyHeatmap2D from '../components/progress/BodyHeatmap2D';
import { useWorkout } from '../context/WorkoutContext';
import { calculateOverallUserRank } from '../utils/ranking';

type Tab = 'feed' | 'leaderboard' | 'prs' | 'heatmap';

export default function SocialPage() {
  const { activeUser } = useUser();
  const { workoutData } = useWorkout();
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  // Compute muscle peak ranks for heatmap
  const rankResult = useMemo(
    () => calculateOverallUserRank(workoutData, activeUser),
    [workoutData, activeUser],
  );

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'feed', label: 'Feed', icon: '📋' },
    { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { key: 'prs', label: 'PRs', icon: '⭐' },
    { key: 'heatmap', label: 'Muscles', icon: '💪' },
  ];

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div
        className="rounded-2xl p-5 text-center overflow-hidden relative"
        style={{
          background: 'linear-gradient(160deg, rgba(20,22,29,0.98), rgba(30,33,43,0.95))',
          border: '1px solid rgba(255, 94, 0, 0.12)',
        }}
      >
        <p className="text-3xl mb-2">🔥</p>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Social Hub</h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Track progress, compete with friends
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-200"
            style={{
              background: activeTab === tab.key ? 'rgba(255, 94, 0, 0.12)' : 'transparent',
              color: activeTab === tab.key ? '#FF5E00' : 'var(--text-muted)',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'feed' && <ActivityFeed />}
      {activeTab === 'leaderboard' && <Leaderboard />}
      {activeTab === 'prs' && <PRBadges userId={activeUser} />}
      {activeTab === 'heatmap' && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}>
          <p className="text-xs font-semibold mb-3 text-center" style={{ color: 'var(--text-muted)' }}>
            Muscle Strength Map
          </p>
          <BodyHeatmap2D muscleRanks={rankResult.muscleRanks} />
        </div>
      )}
    </div>
  );
}
