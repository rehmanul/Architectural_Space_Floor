
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const colorPalettes = [
  { name: 'Professional', colors: ['#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db'] },
  { name: 'Modern', colors: ['#0f172a', '#1e293b', '#334155', '#64748b', '#94a3b8'] },
  { name: 'Warm', colors: ['#7c2d12', '#ea580c', '#fb923c', '#fed7aa', '#fef3c7'] },
  { name: 'Cool', colors: ['#0c4a6e', '#0284c7', '#0ea5e9', '#7dd3fc', '#e0f2fe'] },
  { name: 'Nature', colors: ['#14532d', '#16a34a', '#4ade80', '#bbf7d0', '#f0fdf4'] },
];

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [selectedPalette, setSelectedPalette] = useState(0);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-2 mb-4">
        {colorPalettes.map((palette, index) => (
          <button
            key={palette.name}
            onClick={() => setSelectedPalette(index)}
            className={cn(
              'px-3 py-1 text-xs rounded',
              selectedPalette === index
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            {palette.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {colorPalettes[selectedPalette].colors.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={cn(
              'w-8 h-8 rounded border-2 transition-transform hover:scale-110',
              value === color ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
