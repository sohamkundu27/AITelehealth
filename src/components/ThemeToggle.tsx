import { useTheme } from '../contexts/ThemeContext';

/**
 * Theme toggle button component that switches between light and dark themes.
 * Displays sun/moon icons and provides smooth transition feedback.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="theme-toggle-icon">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
      <span className="theme-toggle-label">{theme === 'light' ? 'Dark' : 'Light'}</span>
      <style>{`
        .theme-toggle {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: var(--bg-overlay);
          border: 2px solid var(--border-color);
          color: var(--text-primary);
          min-width: 100px;
          height: 48px;
          border-radius: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          box-shadow: var(--shadow-md);
        }
        .theme-toggle:hover {
          transform: translateY(-2px) scale(1.02);
          background: var(--bg-hover);
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-lg);
        }
        .theme-toggle:active {
          transform: translateY(0) scale(0.98);
        }
        .theme-toggle-icon {
          display: block;
          font-size: 20px;
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }
        .theme-toggle:hover .theme-toggle-icon {
          transform: rotate(180deg);
        }
        .theme-toggle-label {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }
        @media (max-width: 768px) {
          .theme-toggle {
            top: 10px;
            right: 10px;
            min-width: 90px;
            height: 44px;
            padding: 0 14px;
            font-size: 13px;
            gap: 6px;
          }
          .theme-toggle-icon {
            font-size: 18px;
          }
          .theme-toggle-label {
            font-size: 13px;
          }
        }
      `}</style>
    </button>
  );
}
