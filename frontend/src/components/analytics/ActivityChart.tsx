import React from 'react';

interface DataPoint {
  date: string;
  users: number;
}

interface ActivityChartProps {
  data: DataPoint[];
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.users), 1);

  // Calculate chart dimensions
  const chartHeight = 200;
  const barWidth = Math.max(8, 100 / data.length);

  // Generate Y-axis labels
  const yLabels = [
    maxValue,
    Math.round(maxValue * 0.75),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.25),
    0
  ];

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-500">
        {yLabels.map((label, i) => (
          <span key={i} className="text-right pr-2">{label}</span>
        ))}
      </div>

      {/* Chart area */}
      <div className="ml-12 relative" style={{ height: chartHeight }}>
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-gray-700/50" />
          ))}
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-between gap-1 px-1">
          {data.map((point, index) => {
            const height = maxValue > 0 ? (point.users / maxValue) * 100 : 0;
            const isToday = index === data.length - 1;
            
            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center justify-end group relative"
                style={{ maxWidth: `${barWidth}%` }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                    <div className="font-medium">{point.users} users</div>
                    <div className="text-gray-400">{formatDate(point.date)}</div>
                  </div>
                </div>
                
                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    isToday 
                      ? 'bg-gradient-to-t from-indigo-600 to-indigo-400' 
                      : 'bg-gradient-to-t from-indigo-600/60 to-indigo-400/60 hover:from-indigo-600 hover:to-indigo-400'
                  }`}
                  style={{ 
                    height: `${Math.max(height, 2)}%`,
                    minHeight: '4px'
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="ml-12 flex justify-between mt-2 text-xs text-gray-500 overflow-hidden">
        {data.filter((_, i) => i % Math.ceil(data.length / 7) === 0 || i === data.length - 1).map((point) => (
          <span key={point.date} className="truncate">
            {formatShortDate(point.date)}
          </span>
        ))}
      </div>
    </div>
  );
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
}
