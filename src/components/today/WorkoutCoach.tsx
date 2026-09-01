import type { CoachInsights } from '../../utils/coach';

export default function WorkoutCoach({ insights }: { insights: CoachInsights }) {
  return (
    <div
      className="rounded-2xl p-5 text-left"
      style={{
        background: 'linear-gradient(160deg, rgba(255,94,0,0.06), rgba(120,60,255,0.04))',
        border: '1px solid rgba(255,94,0,0.14)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🧠</span>
        <h3 className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: '#FF5E00' }}>
          Coach Recap
        </h3>
      </div>

      {/* Summary */}
      <p className="text-sm" style={{ color: 'rgba(226,232,240,0.92)' }}>
        {insights.summary}
      </p>

      {/* Advice lines */}
      <div className="mt-3 space-y-1.5">
        {insights.advice.map((line, i) => (
          <p
            key={i}
            className="text-[13px] leading-relaxed"
            style={{ color: i === 0 ? 'rgba(203,213,225,0.85)' : 'rgba(148,163,184,0.8)' }}
          >
            <span className="mr-1.5" style={{ color: '#FF5E00' }}>•</span>
            {line}
          </p>
        ))}
      </div>

      {insights.weakest.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {insights.weakest.map((w) => (
            <span
              key={w.muscle}
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: `${w.tier.color}18`, color: w.tier.color, border: `1px solid ${w.tier.color}30` }}
            >
              {w.muscle} · {w.tier.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
