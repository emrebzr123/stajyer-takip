'use client';
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutData {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  total: number;
  centerLabel?: string;
}

export default function DonutChart({ data, total, centerLabel = 'Toplam' }: DonutChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [{
      data: data.map((d) => d.count),
      backgroundColor: data.map((d) => d.color),
      borderWidth: 0,
      cutout: '72%',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
  } as const;

  return (
    <div className="donut-container">
      <div className="donut-chart-wrap">
        <Doughnut data={chartData} options={options} />
        <div className="donut-center">
          <div className="donut-center-value">{total}</div>
          <div className="donut-center-label">{centerLabel}</div>
        </div>
      </div>
      <div className="legend-list">
        {data.map((d) => (
          <div key={d.label} className="legend-item">
            <div className="legend-left">
              <span className="legend-dot" style={{ background: d.color }} />
              <span>{d.label}</span>
            </div>
            <span className="legend-count">{d.count} ({d.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
