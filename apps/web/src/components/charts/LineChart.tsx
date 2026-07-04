'use client';
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface LineChartProps {
  labels: string[];
  values: number[];
}

export default function LineChart({ labels, values }: LineChartProps) {
  const chartData = {
    labels,
    datasets: [{
      data: values,
      borderColor: '#0056D2',
      backgroundColor: 'rgba(0,86,210,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#0056D2',
      borderWidth: 2,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: '#F3F4F6' }, beginAtZero: true, ticks: { font: { size: 11 } } },
    },
  } as const;

  return (
    <div className="chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
}
