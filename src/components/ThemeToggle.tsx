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
      <style>{`
        .theme-toggle {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: var(--bg-overlay);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: transform 0.2s ease, background 0.2s ease;
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .theme-toggle:hover {
          transform: scale(1.05);
          background: var(--bg-hover);
        }
        .theme-toggle:active {
          transform: scale(0.98);
        }
        .theme-toggle-icon {
          display: block;
          transition: transform 0.2s ease;
        }
        .theme-toggle:hover .theme-toggle-icon {
          transform: rotate(90deg);
        }
        @media (max-width: 768px) {
          .theme-toggle {
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            font-size: 18px;
          }
        }
      `}</style>
    </button>
  );
}
