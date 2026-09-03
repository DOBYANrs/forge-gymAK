import { useUser } from '../../context/UserContext';
import { USER_COLORS } from '../../types';
import type { SetRecord } from '../../types';

interface SetRowProps {
  setIndex: number;
  setData: SetRecord;
  previousSet?: SetRecord;
  isBodyweightTimed?: boolean;
  bodyWeight?: number;
  onUpdate: (weightKg: number, reps: number) => void;
  onToggleComplete?: () => void;
  onRemove?: () => void;
  canRemove: boolean;
}

export default function SetRow({ setIndex, setData, previousSet, isBodyweightTimed, bodyWeight = 0, onUpdate, onToggleComplete, onRemove, canRemove }: SetRowProps) {
  const { activeUser } = useUser();
  const colors = USER_COLORS[activeUser];
  const isCompleted = setData.completed ?? false;

  // Bodyweight-timed exercises (e.g. Dead Hang): the first field defaults to
  // the user's bodyweight and the second field logs hold time in seconds.
  const weightValue = isBodyweightTimed
    ? (setData.weightKg > 0 ? setData.weightKg : (bodyWeight || ''))
    : setData.weightKg;
  const weightPlaceholder = isBodyweightTimed
    ? (previousSet && previousSet.weightKg > 0 ? `Prev: ${previousSet.weightKg}` : (bodyWeight ? String(bodyWeight) : 'kg'))
    : (previousSet && previousSet.weightKg > 0 ? `Prev: ${previousSet.weightKg}` : 'kg');
  const repsPlaceholder = isBodyweightTimed
    ? (previousSet && previousSet.reps > 0 ? `Prev: ${previousSet.reps}s` : 'sec')
    : (previousSet && previousSet.reps > 0 ? `Prev: ${previousSet.reps}` : 'reps');

  // Check if this is a PR (heavier than last week)
  const isPR = previousSet && previousSet.weightKg > 0 && setData.weightKg > previousSet.weightKg;

  return (
    <div
      className="flex items-center gap-3 py-2 rounded-xl transition-all duration-300 group"
      style={{
        background: isCompleted ? 'rgba(0, 230, 118, 0.08)' : 'transparent',
        transform: isCompleted ? 'scale(1)' : undefined,
      }}
    >
      {/* Set number */}
      <span
        className="w-8 text-center text-sm font-medium"
        style={{ color: isCompleted ? '#00E676' : 'var(--text-muted)' }}
      >
        {setIndex + 1}
      </span>

      {/* Weight input */}
      <div className="flex-1 relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          placeholder={weightPlaceholder}
          value={String(weightValue) || ''}
          onChange={(e) => onUpdate(parseFloat(e.target.value) || 0, setData.reps)}
          className="input-field text-center"
          style={{
            borderColor: isPR ? '#00E676' : isCompleted ? 'rgba(0, 230, 118, 0.3)' : colors.border,
            boxShadow: isPR ? '0 0 12px rgba(0, 230, 118, 0.2)' : undefined,
          }}
        />
        {isPR && (
          <span
            className="absolute -top-1 -right-1 text-[8px] font-bold px-1 py-0.5 rounded-full"
            style={{ background: '#00E676', color: '#0B0C10' }}
          >
            PR
          </span>
        )}
      </div>

      <span style={{ color: 'var(--text-muted)' }} className="text-sm font-medium">×</span>

      {/* Reps / Time input */}
      <div className="flex-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={isBodyweightTimed ? 1 : 1}
          placeholder={repsPlaceholder}
          value={setData.reps || ''}
          onChange={(e) => onUpdate(isBodyweightTimed ? (setData.weightKg > 0 ? setData.weightKg : bodyWeight) : setData.weightKg, parseInt(e.target.value) || 0)}
          className="input-field text-center"
          style={{
            borderColor: isCompleted ? 'rgba(0, 230, 118, 0.3)' : colors.border,
          }}
        />
      </div>

      {/* Completion checkbox */}
      {onToggleComplete && (
        <button
          onClick={onToggleComplete}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 active:scale-90"
          style={{
            background: isCompleted ? '#00E676' : 'rgba(255, 255, 255, 0.06)',
            border: isCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: isCompleted ? '0 0 12px rgba(0, 230, 118, 0.3)' : undefined,
            transform: isCompleted ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {isCompleted && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0B0C10" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
          style={{ color: 'rgba(255, 82, 82, 0.5)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
