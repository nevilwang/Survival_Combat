import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VirtualJoystickProps {
  onMove: (direction: { x: number; y: number }) => void;
  size?: number;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, size = 120 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();

  const maxDistance = size / 2 - 20; // 20 is half of knob size

  const updateJoystick = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let x = deltaX;
    let y = deltaY;

    if (distance > maxDistance) {
      x = (deltaX / distance) * maxDistance;
      y = (deltaY / distance) * maxDistance;
    }

    setKnobPosition({ x, y });

    // Normalize the values to -1 to 1 range
    const normalizedX = x / maxDistance;
    const normalizedY = y / maxDistance;

    onMove({ x: normalizedX, y: normalizedY });
  }, [maxDistance, onMove]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    updateJoystick(clientX, clientY);
  }, [updateJoystick]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      updateJoystick(clientX, clientY);
    });
  }, [isDragging, updateJoystick]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [onMove]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX, touch.clientY);
    }
  }, [handleMove]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    handleEnd();
  }, [handleEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 left-6 select-none touch-none z-50"
      style={{
        width: size,
        height: size,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Joystick base */}
      <div
        className="absolute inset-0 rounded-full border-4 border-white/30 bg-black/20 backdrop-blur-sm"
        style={{
          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.3)',
        }}
      />
      
      {/* Joystick knob */}
      <div
        ref={knobRef}
        className="absolute w-10 h-10 rounded-full bg-white/80 border-2 border-white shadow-lg transition-all duration-75"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${knobPosition.x}px), calc(-50% + ${knobPosition.y}px))`,
          boxShadow: isDragging 
            ? '0 0 20px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
      />
      
      {/* Center dot */}
      <div
        className="absolute w-2 h-2 rounded-full bg-gray-400 pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
};

export default VirtualJoystick;