import { useState, useRef, useCallback } from 'react';
import { useUser } from '../../context/UserContext';
import { useWorkout } from '../../context/WorkoutContext';
import { useTimer } from '../../context/TimerContext';
import { USER_COLORS } from '../../types';
import type { ExerciseLog } from '../../types';
import SetRow from './SetRow';

interface WorkoutCardProps {
  exercise: ExerciseLog;
  exerciseIndex: number;
  dateKey: string;
  previousExercise?: ExerciseLog;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function WorkoutCard({ exercise, exerciseIndex, dateKey, previousExercise, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: WorkoutCardProps) {
  const { activeUser } = useUser();
  const colors = USER_COLORS[activeUser];
  const { updateSet, addSet, removeSet } = useWorkout();
  const { startTimer } = useTimer();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const totalVolume = exercise.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);

  // Spotlight tracking (Aceternity-style)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  }, []);

  const handleUpdateSet = (setIndex: number, weightKg: number, reps: number) => {
    updateSet(activeUser, dateKey, exerciseIndex, setIndex, weightKg, reps);
  };

  const handleAddSet = () => {
    addSet(activeUser, dateKey, exerciseIndex);
  };

  const handleRemoveSet = (setIndex: number) => {
    removeSet(activeUser, dateKey, exerciseIndex, setIndex);
  };

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} className="card mb-3 overflow-hidden animate-slideUp" style={{ borderLeft: `3px solid ${colors.primary}` }}>
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>{exercise.exerciseName}</h3>
          {exercise.pattern !== 'normal' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}
            >
              {exercise.pattern.replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onMoveUp && !isFirst && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              className="p-1.5 rounded-lg active:scale-90"
              style={{ color: 'rgba(148,163,184,0.4)', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.color = '#fbbf24'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.4)'; }}
              title="Move up"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {onMoveDown && !isLast && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              className="p-1.5 rounded-lg active:scale-90"
              style={{ color: 'rgba(148,163,184,0.4)', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.color = '#fbbf24'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.4)'; }}
              title="Move down"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); startTimer(2); }}
            className="p-1.5 rounded-lg active:scale-90"
            style={{ color: 'rgba(148,163,184,0.4)', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.color = '#fbbf24'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.4)'; }}
            title="Start rest timer"
          >
            ⏱
          </button>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this exercise?')) onDelete(); }}
              className="p-1.5 rounded-lg active:scale-90"
              style={{ color: 'rgba(239,68,68,0.4)', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.4)'; }}
              title="Delete exercise"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {totalVolume > 0 && (
            <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>
              {totalVolume} kg
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            style={{ color: 'rgba(148,163,184,0.3)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-3 pl-8 mb-1">
            <div className="flex-1 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.4)' }}>Weight</span>
            </div>
            <div className="flex-1 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.4)' }}>Reps</span>
            </div>
          </div>

          {/* Sets */}
          <div className="space-y-1">
            {exercise.sets.map((set, i) => (
              <SetRow
                key={i}
                setIndex={i}
                setData={set}
                previousSet={previousExercise?.sets[i]}
                onUpdate={(kg, reps) => handleUpdateSet(i, kg, reps)}
                onRemove={() => handleRemoveSet(i)}
                canRemove={exercise.sets.length > 1}
              />
            ))}
          </div>

          {/* Add set button */}
          {exercise.sets.length < 10 && (
            <button
              onClick={handleAddSet}
              className="w-full mt-2 py-2 rounded-xl border-2 border-dashed text-sm font-medium ripple-container active:scale-[0.98]"
              style={{
                borderColor: 'rgba(251,191,36,0.12)',
                color: 'rgba(251,191,36,0.6)',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.3)'; e.currentTarget.style.background = 'rgba(251,191,36,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.12)'; e.currentTarget.style.background = 'transparent'; }}
            >
              + Add Set
            </button>
          )}
        </>
      )}
    </div>
  );
}
