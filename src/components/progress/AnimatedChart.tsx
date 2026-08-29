import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface AnimatedChartProps {
  data: ChartDataPoint[];
  color?: string;
  gradientId?: string;
  yLabel?: string;
  height?: number;
  showArea?: boolean;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: 'var(--bg-surface-elevated)',
        border: 'var(--border-subtle)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold" style={{ color: '#FF5E00' }}>{payload[0].value} kg</p>
    </div>
  );
};

export default function AnimatedChart({
  data,
  color = '#FF5E00',
  gradientId = 'chartGradient',
  yLabel: _yLabel = 'Weight (kg)',
  height = 200,
  showArea = true,
}: AnimatedChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {showArea ? (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            animationDuration={1200}
            animationEasing="ease-out"
            dot={false}
            activeDot={{
              r: 5,
              fill: color,
              stroke: '#0B0C10',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            animationDuration={1200}
            animationEasing="ease-out"
            dot={false}
            activeDot={{
              r: 5,
              fill: color,
              stroke: '#0B0C10',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
