import React, { ReactNode } from 'react';

interface ThemedButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: ReactNode;
  theme: {
    button: {
      from: string;
      via: string;
      to: string;
      shadow: string;
      shadowRgb: string;
    }
  };
  className?: string;
}

const ThemedButton: React.FC<ThemedButtonProps> = React.memo(({ onClick, disabled, children, theme, className }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-2.5 rounded-full font-semibold text-sm text-white
        flex items-center justify-center gap-2
        relative overflow-hidden group 
        transition-all transform hover:scale-105 active:scale-95
        bg-gradient-to-br ${theme.button.from} ${theme.button.via} ${theme.button.to}
        shadow-2xl ${theme.button.shadow} 
        backdrop-blur-sm
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className || ''}
      `}
      style={{
        boxShadow: `0 8px 32px rgba(${theme.button.shadowRgb}, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
});

ThemedButton.displayName = 'ThemedButton';

export default ThemedButton;