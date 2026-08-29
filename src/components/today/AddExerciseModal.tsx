import { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useWorkout } from '../../context/WorkoutContext';
import type { ExercisePattern } from '../../types';

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
}

const patterns: { value: ExercisePattern; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'drop_set', label: 'Drop Set' },
  { value: 'superset', label: 'Superset' },
  { value: 'pyramid', label: 'Pyramid' },
];

export default function AddExerciseModal({ isOpen, onClose, dateKey }: AddExerciseModalProps) {
  const { activeUser } = useUser();
  const { addExercise } = useWorkout();

  const [exerciseName, setExerciseName] = useState('');
  const [pattern, setPattern] = useState<ExercisePattern>('normal');
  const [numSets, setNumSets] = useState(4);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName.trim()) return;
    addExercise(activeUser, dateKey, exerciseName.trim(), pattern, numSets);
    setExerciseName('');
    setPattern('normal');
    setNumSets(4);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 animate-slideUp mx-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(22,22,40,0.98), rgba(30,30,50,0.95))',
          border: '1px solid rgba(255,94,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Add Exercise</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(148,163,184,0.5)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(148,163,184,0.6)' }}>Exercise Name</label>
            <input
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="e.g. Dumbbell Flyes"
              className="input-field text-left"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(148,163,184,0.6)' }}>Pattern</label>
            <div className="grid grid-cols-2 gap-2">
              {patterns.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPattern(p.value)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: pattern === p.value ? 'rgba(255,94,0,0.15)' : 'rgba(255,255,255,0.05)',
                    color: pattern === p.value ? '#FF5E00' : 'rgba(148,163,184,0.6)',
                    border: pattern === p.value ? '1px solid rgba(255,94,0,0.3)' : '1px solid transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Sets: <span className="font-bold" style={{ color: '#FF5E00' }}>{numSets}</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={numSets}
              onChange={(e) => setNumSets(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: '#FF5E00' }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={!exerciseName.trim()}
          >
            Add Exercise
          </button>
        </form>
      </div>
    </div>
  );
}
