import { type CSSProperties, type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  glow?: boolean;
}

export default function Card({ children, style, onClick, hoverable, glow }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : undefined,
        boxShadow: glow ? 'var(--shadow-glow)' : 'none',
        ...(hoverable ? { ':hover': { borderColor: 'var(--accent-border)' } } : {}),
        ...style,
      }}
      onMouseEnter={hoverable ? (e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      } : undefined}
    >
      {children}
    </div>
  );
}
