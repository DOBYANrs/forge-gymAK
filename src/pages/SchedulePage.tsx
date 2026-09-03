import { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { getWeekSchedule } from '../data/schedule';
import type { ExercisePattern, DayOfWeek, PresetExercise } from '../types';

const REST_PRESETS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
];

interface AddExerciseFormProps {
  dayOfWeek: DayOfWeek;
  onClose: () => void;
}

function AddExerciseForm({ dayOfWeek, onClose }: AddExerciseFormProps) {
  const { addExerciseToSchedule } = useSchedule();
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState<ExercisePattern>('normal');
  const [numSets, setNumSets] = useState(3);
  const [targetReps, setTargetReps] = useState('10–12');
  const [restSeconds, setRestSeconds] = useState<number>(90);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addExerciseToSchedule(dayOfWeek, {
      name: name.trim(),
      pattern,
      defaultSets: numSets,
      targetReps: targetReps.trim() || undefined,
      restSeconds: restSeconds || undefined,
      notes: notes.trim() || undefined,
    });
    setName('');
    setPattern('normal');
    setNumSets(3);
    setTargetReps('10–12');
    setRestSeconds(90);
    setNotes('');
    onClose();
  };

  const patterns: { value: ExercisePattern; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'drop_set', label: 'Drop Set' },
    { value: 'superset', label: 'Superset' },
    { value: 'pyramid', label: 'Pyramid' },
  ];

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 rounded-xl space-y-3 animate-slideUp"
      style={{ background: 'linear-gradient(160deg, rgba(28,28,52,0.95), rgba(18,18,38,0.9))', border: '1px solid rgba(255,94,0,0.12)' }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        className="input-field text-left text-sm"
        autoFocus
      />
      <div className="flex gap-2 flex-wrap">
        {patterns.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPattern(p.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: pattern === p.value ? '#FF5E00' : 'rgba(255,255,255,0.06)',
              color: pattern === p.value ? '#0f0f1a' : '#94a3b8',
              border: `1px solid ${pattern === p.value ? '#FF5E00' : 'rgba(255,255,255,0.08)'}`,
              transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Sets</label>
          <input
            type="number"
            min={1}
            max={10}
            value={numSets}
            onChange={(e) => setNumSets(parseInt(e.target.value) || 3)}
            className="input-field text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Target Reps</label>
          <input
            type="text"
            value={targetReps}
            onChange={(e) => setTargetReps(e.target.value)}
            placeholder="e.g. 8–10"
            className="input-field text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Rest</label>
          <select
            value={restSeconds}
            onChange={(e) => setRestSeconds(parseInt(e.target.value))}
            className="input-field text-sm"
            style={{ color: '#e2e8f0' }}
          >
            {REST_PRESETS.map((r) => (
              <option key={r.value} value={r.value} style={{ background: '#1a1a2e', color: '#e2e8f0' }}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] block mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Squeeze & Stretch"
          className="input-field text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1 text-sm" disabled={!name.trim()}>
          Add
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

interface EditExerciseFormProps {
  dayOfWeek: DayOfWeek;
  exerciseIndex: number;
  exercise: PresetExercise;
  onClose: () => void;
}

function EditExerciseForm({ dayOfWeek, exerciseIndex, exercise, onClose }: EditExerciseFormProps) {
  const { updateExerciseInSchedule } = useSchedule();
  const [name, setName] = useState(exercise.name);
  const [pattern, setPattern] = useState<ExercisePattern>(exercise.pattern);
  const [numSets, setNumSets] = useState(exercise.defaultSets);
  const [targetReps, setTargetReps] = useState(exercise.targetReps ?? '');
  const [restSeconds, setRestSeconds] = useState(exercise.restSeconds ?? 90);
  const [notes, setNotes] = useState(exercise.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateExerciseInSchedule(dayOfWeek, exerciseIndex, {
      name: name.trim(),
      pattern,
      defaultSets: numSets,
      targetReps: targetReps.trim() || undefined,
      restSeconds: restSeconds || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const patterns: { value: ExercisePattern; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'drop_set', label: 'Drop Set' },
    { value: 'superset', label: 'Superset' },
    { value: 'pyramid', label: 'Pyramid' },
  ];

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 rounded-xl space-y-3 animate-slideUp"
      style={{ background: 'linear-gradient(160deg, rgba(28,28,52,0.95), rgba(18,18,38,0.9))', border: '1px solid rgba(255,94,0,0.12)' }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        className="input-field text-left text-sm"
        autoFocus
      />
      <div className="flex gap-2 flex-wrap">
        {patterns.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPattern(p.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: pattern === p.value ? '#FF5E00' : 'rgba(255,255,255,0.06)',
              color: pattern === p.value ? '#0f0f1a' : '#94a3b8',
              border: `1px solid ${pattern === p.value ? '#FF5E00' : 'rgba(255,255,255,0.08)'}`,
              transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Sets</label>
          <input
            type="number"
            min={1}
            max={10}
            value={numSets}
            onChange={(e) => setNumSets(parseInt(e.target.value) || 3)}
            className="input-field text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Target Reps</label>
          <input
            type="text"
            value={targetReps}
            onChange={(e) => setTargetReps(e.target.value)}
            placeholder="e.g. 8–10"
            className="input-field text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Rest</label>
          <select
            value={restSeconds}
            onChange={(e) => setRestSeconds(parseInt(e.target.value))}
            className="input-field text-sm"
            style={{ color: '#e2e8f0' }}
          >
            {REST_PRESETS.map((r) => (
              <option key={r.value} value={r.value} style={{ background: '#1a1a2e', color: '#e2e8f0' }}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] block mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Squeeze & Stretch"
          className="input-field text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1 text-sm" disabled={!name.trim()}>
          Save
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function SchedulePage() {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{ day: string; index: number } | null>(null);
  const { removeExerciseFromSchedule, getScheduleForDay, clearDaySchedule } = useSchedule();
  const weekSchedule = getWeekSchedule(new Date());

  return (
    <div className="space-y-3 page-enter">
      <div className="flex items-center justify-between mb-1">
        <h2 className="section-title">Weekly Schedule</h2>
        <span className="text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>
          Tap to expand · Edit any exercise
        </span>
      </div>

      {weekSchedule.map((day, dayIdx) => {
        const isExpanded = expandedDay === day.dayOfWeek;
        const isAdding = addingToDay === day.dayOfWeek;
        const isEditing = editingExercise?.day === day.dayOfWeek;
        const allExercises = getScheduleForDay(day.dayOfWeek, day.exercises);

        return (
          <div
            key={day.dayOfWeek}
            className="card overflow-hidden animate-slideUp"
            style={{ animationDelay: `${dayIdx * 60}ms` }}
          >
            <button
              onClick={() => {
                setExpandedDay(isExpanded ? null : day.dayOfWeek);
                setAddingToDay(null);
                setEditingExercise(null);
              }}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{
                    background: day.isRestDay
                      ? 'rgba(255,255,255,0.04)'
                      : 'linear-gradient(135deg, rgba(255,94,0,0.08), rgba(255,255,255,0.04))',
                    transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  {day.isRestDay ? '😴' : '💪'}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>{day.label}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(148,163,184,0.55)' }}>
                    {day.isRestDay
                      ? 'Rest day'
                      : `${day.muscleGroups.join(' · ')} · ${allExercises.length} exercises`}
                  </p>
                </div>
              </div>
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                style={{ color: 'rgba(148,163,184,0.3)' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="mt-3 pt-3 animate-fadeIn" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {day.focus && (
                  <p className="text-[10px] mb-2 px-1" style={{ color: 'rgba(255,94,0,0.5)' }}>
                    Focus: {day.focus}
                  </p>
                )}

                {allExercises.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>No exercises scheduled</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>Add exercises below</p>
                  </div>
                ) : (
                  <div className="space-y-1 mb-3">
                    {allExercises.map((ex, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 rounded-xl group"
                        style={{
                          background: editingExercise?.day === day.dayOfWeek && editingExercise?.index === i
                            ? 'rgba(255,94,0,0.06)'
                            : 'transparent',
                          border: editingExercise?.day === day.dayOfWeek && editingExercise?.index === i
                            ? '1px solid rgba(255,94,0,0.15)'
                            : '1px solid transparent',
                          transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                        }}
                        onMouseEnter={(e) => {
                          if (!(editingExercise?.day === day.dayOfWeek && editingExercise?.index === i))
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }}
                        onMouseLeave={(e) => {
                          if (!(editingExercise?.day === day.dayOfWeek && editingExercise?.index === i))
                            e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#FF5E00' }} />
                          <span className="text-sm font-medium" style={{ color: 'rgba(203,213,225,0.9)' }}>{ex.name}</span>
                          {ex.pattern !== 'normal' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: 'rgba(255,94,0,0.1)', color: '#FF5E00' }}
                            >
                              {ex.pattern.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>{ex.defaultSets} sets</span>
                          {ex.targetReps && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                              {ex.targetReps}
                            </span>
                          )}
                          {ex.restSeconds != null && ex.restSeconds > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc' }}>
                              {ex.restSeconds >= 60 ? `${ex.restSeconds / 60}m` : `${ex.restSeconds}s`}
                            </span>
                          )}
                          {ex.notes && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full italic" style={{ background: 'rgba(234,179,8,0.1)', color: '#facc15' }}>
                              {ex.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingExercise({ day: day.dayOfWeek, index: i })}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 active:scale-90"
                            style={{ color: 'rgba(255,94,0,0.5)', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,94,0,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            title="Edit exercise"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${ex.name}"?`))
                                removeExerciseFromSchedule(day.dayOfWeek, i);
                            }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 active:scale-90"
                            style={{ color: 'rgba(239,68,68,0.5)', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            title="Delete exercise"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {isEditing && editingExercise ? (
                    <EditExerciseForm
                      dayOfWeek={day.dayOfWeek}
                      exerciseIndex={editingExercise.index}
                      exercise={allExercises[editingExercise.index]}
                      onClose={() => setEditingExercise(null)}
                    />
                  ) : isAdding ? (
                    <AddExerciseForm dayOfWeek={day.dayOfWeek} onClose={() => setAddingToDay(null)} />
                  ) : (
                    <button
                      onClick={() => { setAddingToDay(day.dayOfWeek); setEditingExercise(null); }}
                      className="flex-1 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium active:scale-[0.98]"
                      style={{ borderColor: 'rgba(255,94,0,0.15)', color: 'rgba(255,94,0,0.7)', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,94,0,0.3)'; e.currentTarget.style.background = 'rgba(255,94,0,0.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,94,0,0.15)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      + Add Exercise
                    </button>
                  )}
                  {allExercises.length > 0 && !isEditing && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Clear all exercises from ${day.label}?`)) {
                          clearDaySchedule(day.dayOfWeek);
                        }
                      }}
                      className="py-2.5 px-4 rounded-xl text-sm font-medium active:scale-[0.98]"
                      style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.2)', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
