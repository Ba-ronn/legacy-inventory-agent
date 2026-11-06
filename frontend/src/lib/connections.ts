/**
 * The databases this browser has already onboarded.
 *
 * The approved mapping itself lives on the server, keyed by connection; this is
 * only the list that lets someone pick a database back up without walking
 * through onboarding again.
 *
 * Note that a connection string includes its password, and this keeps several
 * of them rather than the single one the app stored before. It is the same
 * localStorage and the same threat model as that single entry — anything with
 * access to this origin could already read it — but a real deployment should
 * hold these server-side against an authenticated user instead.
 */

const CONNECTIONS_KEY = 'ais.connections';

/** Enough to be useful as a shortcut without turning into an unmanaged list. */
const MAX_CONNECTIONS = 6;

export interface SavedConnection {
  /** The connection URL with its password masked: stable across credential changes. */
  id: string;
  engineId: string;
  engineName: string;
  server: string;
  database: string;
  connectionString: string;
  lastUsedAt: string;
}

/** Splits host and database out of a SQLAlchemy URL for display. */
export function describeConnection(
  connectionString: string | null,
): { server: string; database: string } | null {
  if (!connectionString) return null;

  const hosted = connectionString.match(/@([^/]+)\/([^?]+)/);
  if (hosted) return { server: hosted[1], database: hosted[2] };

  // File-backed engines address a path, not a host — without this a SQLite
  // connection has no host to match and falls back to showing the whole URL.
  const file = connectionString.match(/^[a-z0-9+]+:\/\/\/(.+)$/i);
  if (file) {
    const path = file[1];
    return { server: path, database: path.split(/[\\/]/).pop() || path };
  }

  return null;
}

/** Hides the password so a connection can be identified without exposing it. */
export function maskConnection(connectionString: string): string {
  return connectionString.replace(/(:\/\/[^:/@]+:)[^@]*@/, '$1•••@');
}

const read = (): SavedConnection[] => {
  try {
    const raw = localStorage.getItem(CONNECTIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Written by an older build, or hand-edited: keep only usable records.
    return (parsed as SavedConnection[]).filter(
      (c) => c && typeof c.id === 'string' && typeof c.connectionString === 'string',
    );
  } catch {
    // Storage unavailable or holding something unparseable; behave as if empty.
    return [];
  }
};

const write = (connections: SavedConnection[]): SavedConnection[] => {
  try {
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
  } catch {
    // Private browsing and quota failures are not worth surfacing — the list is
    // a convenience, and onboarding still works without it.
  }
  return connections;
};

const byRecency = (a: SavedConnection, b: SavedConnection) =>
  b.lastUsedAt.localeCompare(a.lastUsedAt);

export function listConnections(): SavedConnection[] {
  return read().sort(byRecency);
}

export interface RememberInput {
  engineId: string;
  engineName: string;
  connectionString: string;
}

/** Adds a connection, or refreshes the one already recorded for that database. */
export function rememberConnection(input: RememberInput): SavedConnection[] {
  const id = maskConnection(input.connectionString);
  const parts = describeConnection(input.connectionString);

  const entry: SavedConnection = {
    id,
    engineId: input.engineId,
    engineName: input.engineName,
    server: parts?.server ?? '',
    database: parts?.database ?? input.connectionString,
    connectionString: input.connectionString,
    lastUsedAt: new Date().toISOString(),
  };

  const rest = read().filter((c) => c.id !== id);
  return write([entry, ...rest].sort(byRecency).slice(0, MAX_CONNECTIONS));
}

export function forgetConnection(id: string): SavedConnection[] {
  return write(read().filter((c) => c.id !== id)).sort(byRecency);
}

export function touchConnection(id: string): void {
  const now = new Date().toISOString();
  write(read().map((c) => (c.id === id ? { ...c, lastUsedAt: now } : c)));
}

/** "just now" / "3 hours ago" — enough to tell recent from stale. */
export function describeLastUsed(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'previously';

  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}
