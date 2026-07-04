'use client';
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface BarChartProps {
  labels: string[];
  values: number[];
  horizontal?: boolean;
  color?: string;
}

export default function BarChart({
  labels, values,
  horizontal = false,
  color = '#0056D2',
}: BarChartProps) {
  const chartData = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: color,
      borderRadius: 4,
      barThickness: horizontal ? 12 : 40,
    }],
  };

  const options = {
    indexAxis: (horizontal ? 'y' : 'x') as 'x' | 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#F3F4F6' }, beginAtZero: true, ticks: { font: { size: 11 } } },
    },
  } as const;

  return (
    <div className="chart-container">
      <Bar data={chartData} options={options} />
    </div>
  );
}
