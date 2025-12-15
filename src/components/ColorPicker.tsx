/**
 * 색상 피커 컴포넌트
 * 파스텔 색상 팔레트에서 색상을 선택할 수 있습니다.
 */

import * as React from 'react';
import { Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

// 현대적이고 차분한 색상 팔레트 (백엔드와 동일)
export const PASTEL_COLORS = [
  '#A8D5E2',  // 소프트 스카이블루
  '#B8D4C1',  // 소프트 민트
  '#D4B8E8',  // 소프트 라벤더
  '#F5C2C7',  // 소프트 로즈
  '#FFD4A3',  // 소프트 피치
  '#C4E0F6',  // 소프트 아쿠아
  '#E8D0B3',  // 소프트 베이지
  '#B5C9E8',  // 소프트 퍼플블루
  '#D9E5C9',  // 소프트 그린
  '#F0D5C4',  // 소프트 코랄
  '#C8D8E8',  // 소프트 그레이블루
  '#E5D4E8',  // 소프트 라일락
];

interface ColorPickerProps {
  currentColor?: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export default function ColorPicker({ currentColor, onColorChange, disabled }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);
  const selectedColor = currentColor || PASTEL_COLORS[0];

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setOpen(false); // 색상 선택 시 팝오버 닫기
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          style={{ backgroundColor: selectedColor }}
          title="색상 변경"
            onClick={(e) => {
              e.stopPropagation();
              // PopoverTrigger가 자동으로 처리하도록 함
            }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <Palette className="h-4 w-4 text-gray-600 dark:text-gray-300 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-[100]" 
        align="start" 
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white">색상 선택</div>
          <div className="grid grid-cols-4 gap-3">
            {PASTEL_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color)}
                className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  selectedColor === color
                    ? 'border-gray-900 dark:border-gray-100 shadow-lg scale-110'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-500'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

