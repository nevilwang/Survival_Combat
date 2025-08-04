import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualButtonsProps {
  onDirectionPress: (direction: 'up' | 'down' | 'left' | 'right', pressed: boolean) => void;
}

const VirtualButtons: React.FC<VirtualButtonsProps> = ({ onDirectionPress }) => {
  const handleTouchStart = (direction: 'up' | 'down' | 'left' | 'right') => {
    onDirectionPress(direction, true);
  };

  const handleTouchEnd = (direction: 'up' | 'down' | 'left' | 'right') => {
    onDirectionPress(direction, false);
  };

  const buttonClass = "w-16 h-16 bg-white/20 hover:bg-white/30 active:bg-white/40 border-2 border-white/30 rounded-lg flex items-center justify-center text-white transition-all duration-150 select-none touch-none";

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* 上方向键 */}
      <button
        className={buttonClass}
        onTouchStart={() => handleTouchStart('up')}
        onTouchEnd={() => handleTouchEnd('up')}
        onMouseDown={() => handleTouchStart('up')}
        onMouseUp={() => handleTouchEnd('up')}
        onMouseLeave={() => handleTouchEnd('up')}
      >
        <ChevronUp size={24} />
      </button>
      
      {/* 左右方向键 */}
      <div className="flex space-x-4">
        <button
          className={buttonClass}
          onTouchStart={() => handleTouchStart('left')}
          onTouchEnd={() => handleTouchEnd('left')}
          onMouseDown={() => handleTouchStart('left')}
          onMouseUp={() => handleTouchEnd('left')}
          onMouseLeave={() => handleTouchEnd('left')}
        >
          <ChevronLeft size={24} />
        </button>
        
        <button
          className={buttonClass}
          onTouchStart={() => handleTouchStart('right')}
          onTouchEnd={() => handleTouchEnd('right')}
          onMouseDown={() => handleTouchStart('right')}
          onMouseUp={() => handleTouchEnd('right')}
          onMouseLeave={() => handleTouchEnd('right')}
        >
          <ChevronRight size={24} />
        </button>
      </div>
      
      {/* 下方向键 */}
      <button
        className={buttonClass}
        onTouchStart={() => handleTouchStart('down')}
        onTouchEnd={() => handleTouchEnd('down')}
        onMouseDown={() => handleTouchStart('down')}
        onMouseUp={() => handleTouchEnd('down')}
        onMouseLeave={() => handleTouchEnd('down')}
      >
        <ChevronDown size={24} />
      </button>
    </div>
  );
};

export default VirtualButtons;