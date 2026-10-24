import React, { useState, useEffect, useRef } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  position: { x: number; y: number };
}

export function Toast({ message, visible, position }: ToastProps) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      left: position.x + 12,
      top: position.y - 40,
      padding: '6px 12px',
      background: '#7c6ff7',
      color: 'white',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      zIndex: 9999,
      pointerEvents: 'none',
      animation: 'fadeIn 0.2s ease',
    }}>
      ✓ Скопировано
    </div>
  );
}

interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onCopy: () => void;
}

export function ContextMenu({ visible, position, onCopy }: ContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      onClick={onCopy}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        padding: '4px 0',
        background: '#1a1a2e',
        border: '1px solid #2a2a3e',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 9998,
        minWidth: 140,
        cursor: 'pointer',
      }}
    >
      <div style={{
        padding: '8px 16px',
        color: '#e8e8e8',
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>📋</span>
        Копировать
      </div>
    </div>
  );
}
