import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Boxes, Moon, Sun } from 'lucide-react';
import { TENANT_ID, loadConnectionString } from '../lib/api';
import type { Theme } from '../lib/useTheme';

interface AppShellProps {
  theme: Theme;
  onToggleTheme: () => void;
  children: ReactNode;
}

/**
 * One persistent chrome for every route. The theme control lives here rather
 * than floating over the page, where it used to overlap page headers.
 */
const AppShell = ({ theme, onToggleTheme, children }: AppShellProps) => {
  const { pathname } = useLocation();

  // Read per render: navigating here after onboarding flips the indicator, and
  // a localStorage read is cheap enough not to warrant caching.
  const isConnected = Boolean(loadConnectionString());

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink">
      {/* Ambient wash — fixed so it never adds to document height. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] grid-texture opacity-60" />
        <div className="absolute -left-[12%] top-[-18%] h-[46vw] w-[46vw] animate-drift rounded-full bg-primary/10 blur-[130px]" />
        <div
          className="absolute -right-[14%] bottom-[-22%] h-[42vw] w-[42vw] animate-drift rounded-full bg-accent/10 blur-[130px]"
          style={{ animationDelay: '-7s' }}
        />
      </div>

      <header className="relative z-20 flex-shrink-0 border-b border-line bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 md:px-8">
          <Link
            to="/"
            className="group flex items-center gap-3 rounded-field py-1 pr-2"
            aria-label="Agentic Inventory — start over"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-primary-on shadow-soft transition-transform duration-300 group-hover:scale-105">
              <Boxes className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold leading-none tracking-tight">
              Agentic<span className="text-primary">Inventory</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <span
              className="hidden items-center gap-2 rounded-pill border border-line bg-surface-sunken px-3 py-1.5 sm:inline-flex"
              title={isConnected ? 'A database is bridged for this tenant' : 'No database bridged yet'}
            >
              <span className="relative flex h-2 w-2" aria-hidden>
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${
                    isConnected ? 'animate-pulse-ring bg-success' : 'bg-ink-faint'
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isConnected ? 'bg-success' : 'bg-ink-faint'
                  }`}
                />
              </span>
              <span className="font-mono text-[11px] font-medium text-ink-muted">{TENANT_ID}</span>
              <span className="sr-only">{isConnected ? 'Database connected' : 'No database connected'}</span>
            </span>

            <button
              type="button"
              onClick={onToggleTheme}
              className="btn-quiet h-9 w-9 !p-0"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
      </header>

      <main key={pathname} className="relative z-10 min-h-0 flex-1 animate-fade-in overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default AppShell;
