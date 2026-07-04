'use client';
import React from 'react';
import { Doughnut } from 'react-chartjs-2';

interface GaugeChartProps {
  distribution: { range: string; count: number; color: string }[];
  average: number;
}

export default function GaugeChart({ distribution, average }: GaugeChartProps) {
  const chartData = {
    labels: distribution.map((d) => d.range),
    datasets: [{
      data: distribution.map((d) => d.count),
      backgroundColor: distribution.map((d) => d.color),
      borderWidth: 0,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    rotation: -90,
    circumference: 180,
    cutout: '70%',
    plugins: { legend: { display: false } },
  } as const;

  return (
    <div className="gauge-container">
      <div style={{ position: 'relative', width: 200, height: 120 }}>
        <Doughnut data={chartData} options={options} />
        <div className="donut-center" style={{ top: '65%' }}>
          <div className="donut-center-value" style={{ fontSize: 18 }}>%{average}</div>
          <div className="donut-center-label">Ortalama İlerleme</div>
        </div>
      </div>
      <div className="gauge-legend">
        {distribution.map((d) => (
          <div key={d.range} className="gauge-legend-item">
            <span className="legend-dot" style={{ background: d.color }} />
            <span>{d.range}</span>
            <strong style={{ marginLeft: 'auto' }}>{d.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
