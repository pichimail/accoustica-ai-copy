import React, { useState } from 'react';

/**
 * Subtle Splitter Component - Works for both vertical and horizontal splitters
 * @param {{ 
 *   orientation?: 'vertical' | 'horizontal';
 *   onPointerDown?: (e: any) => void;
 *   label?: string;
 *   className?: string;
 * }} props
 */
export function SubtleSplitter({
  orientation = 'vertical',
  onPointerDown,
  label = 'Resize',
  className = '',
}) {
  const [hovered, setHovered] = useState(false);

  const isVertical = orientation === 'vertical';

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={orientation}
      tabIndex={0}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`transition-all focus:outline-none group relative ${
        isVertical
          ? 'w-3 flex-shrink-0 cursor-col-resize'
          : 'h-2 flex-shrink-0 cursor-row-resize'
      } ${className}`}
      style={{
        background: hovered
          ? 'rgba(225,29,72,0.06)'
          : 'transparent',
        ...(isVertical && {
          borderLeft: `1px solid ${
            hovered
              ? 'rgba(225,29,72,0.18)'
              : 'rgba(255,255,255,0.04)'
          }`,
          borderRight: `1px solid ${
            hovered
              ? 'rgba(225,29,72,0.1)'
              : 'rgba(255,255,255,0.02)'
          }`,
        }),
        ...(!isVertical && {
          borderTop: `1px solid ${
            hovered
              ? 'rgba(225,29,72,0.18)'
              : 'rgba(255,255,255,0.04)'
          }`,
          borderBottom: `1px solid ${
            hovered
              ? 'rgba(225,29,72,0.1)'
              : 'rgba(255,255,255,0.02)'
          }`,
        }),
      }}
    >
      {/* Subtle center line */}
      <div
        className="absolute"
        style={{
          ...(isVertical && {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '1px',
            height: hovered ? '40%' : '20%',
          }),
          ...(!isVertical && {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: hovered ? '40%' : '20%',
            height: '1px',
          }),
          background: hovered
            ? 'rgba(225,29,72,0.5)'
            : 'rgba(255,255,255,0.1)',
          transition: 'all 200ms ease-out',
        }}
      />

      {/* Glow effect on hover */}
      {hovered && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            ...(isVertical && {
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '6px',
              height: '32px',
              boxShadow: '0 0 12px rgba(225,29,72,0.4)',
            }),
            ...(!isVertical && {
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '32px',
              height: '6px',
              boxShadow: '0 0 12px rgba(225,29,72,0.4)',
            }),
            background: 'rgba(225,29,72,0.2)',
            border: '1px solid rgba(225,29,72,0.3)',
            animation: 'fadeIn 200ms ease-out',
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default SubtleSplitter;
