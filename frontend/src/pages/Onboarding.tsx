import React, { useState } from 'react';
import MappingCanvas from '../components/MappingCanvas';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  History,
  Loader2,
  Server,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
  Workflow,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  describeError,
  inspectDatabase,
  manifestStatus,
  saveConnectionString,
  saveManifest,
  suggestMapping,
} from '../lib/api';
import type { MappingManifest, SchemaTable } from '../lib/api';
import {
  describeLastUsed,
  forgetConnection,
  listConnections,
  rememberConnection,
} from '../lib/connections';
import type { SavedConnection } from '../lib/connections';

interface DbType {
  id: string;
  name: string;
  prefix: string;
  logoUrl: string;
  /** Engines without a Simple Icons logo fall back to a generic database glyph. */
  fallbackIcon?: boolean;
  isSupported: boolean;
}

const DB_TYPES: DbType[] = [
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    prefix: 'postgresql+asyncpg://',
    logoUrl: 'https://cdn.simpleicons.org/postgresql',
    isSupported: true,
  },
  {
    id: 'mysql',
    name: 'MySQL',
    prefix: 'mysql+aiomysql://',
    logoUrl: 'https://cdn.simpleicons.org/mysql',
    isSupported: true,
  },
  {
    id: 'mssql',
    name: 'SQL Server',
    prefix: 'mssql+aioodbc://',
    logoUrl: '',
    fallbackIcon: true,
    isSupported: true,
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    prefix: 'sqlite+aiosqlite:///',
    logoUrl: 'https://cdn.simpleicons.org/sqlite',
    isSupported: true,
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    prefix: 'mongodb://',
    logoUrl: 'https://cdn.simpleicons.org/mongodb',
    isSupported: false,
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    prefix: 'dynamodb://',
    logoUrl: '',
    fallbackIcon: true,
    isSupported: false,
  },
];

/** The engine's mark, falling back to a generic glyph where there is no logo. */
const EngineGlyph = ({ db, className }: { db?: DbType; className?: string }) =>
  !db || db.fallbackIcon || !db.logoUrl ? (
    <Database className={className} />
  ) : (
    <img src={db.logoUrl} alt="" aria-hidden className={className} />
  );

const STEPS = [
  { id: 1, title: 'Select engine', hint: 'Pick your database' },
  { id: 2, title: 'Connect', hint: 'Point us at the schema' },
  { id: 3, title: 'Review mapping', hint: 'Approve the bridge' },
] as const;

/** Horizontal on desktop, a compact bar on phones — it used to vanish below md. */
const Stepper = ({ step }: { step: number }) => (
  <>
    <ol className="hidden items-center gap-1 md:flex">
      {STEPS.map((s, index) => {
        const isDone = step > s.id;
        const isCurrent = step === s.id;
        return (
          <li key={s.id} className="flex items-center gap-1">
            <div className="flex items-center gap-2.5 rounded-pill px-2 py-1">
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-all duration-300 ${
                  isCurrent
                    ? 'bg-primary text-primary-on shadow-glow'
                    : isDone
                      ? 'bg-primary/15 text-primary'
                      : 'border border-line bg-surface-sunken text-ink-faint'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : s.id}
              </span>
              <span
                className={`text-[13px] font-semibold transition-colors ${
                  isCurrent ? 'text-ink' : isDone ? 'text-ink-muted' : 'text-ink-faint'
                }`}
              >
                {s.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`h-px w-8 transition-colors duration-500 ${isDone ? 'bg-primary/50' : 'bg-line'}`}
              />
            )}
          </li>
        );
      })}
    </ol>

    <div className="w-full md:hidden">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{STEPS[step - 1].title}</span>
        <span className="font-mono text-[11px] text-ink-muted">
          {step} / {STEPS.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-pill bg-surface-sunken">
        <div
          className="h-full rounded-pill bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  </>
);

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDb, setSelectedDb] = useState<DbType | null>(null);
  const [connectionString, setConnectionString] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [legacySchema, setLegacySchema] = useState<SchemaTable[]>([]);
  const [manifest, setManifest] = useState<MappingManifest | null>(null);

  // Databases onboarded earlier, offered as a shortcut past this whole flow.
  const [saved, setSaved] = useState<SavedConnection[]>(listConnections);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const handleDbSelect = (db: DbType) => {
    if (!db.isSupported) return;
    setSelectedDb(db);
    setConnectionString(db.prefix);
    setError(null);
    setNotice(null);
    setStep(2);
  };

  /**
   * Picks up a saved database. The mapping lives on the server, so this only
   * confirms it is still there before handing straight over to the agent —
   * if it has gone, onboarding resumes at the connection step instead.
   */
  const handleResume = async (connection: SavedConnection) => {
    setError(null);
    setNotice(null);
    setResumingId(connection.id);

    const engine =
      DB_TYPES.find((db) => db.id === connection.engineId) ?? DB_TYPES[0];

    try {
      const status = await manifestStatus(connection.connectionString);

      if (status.exists) {
        saveConnectionString(connection.connectionString);
        setSaved(rememberConnection({
          engineId: engine.id,
          engineName: engine.name,
          connectionString: connection.connectionString,
        }));
        navigate('/chat');
        return;
      }

      setSelectedDb(engine);
      setConnectionString(connection.connectionString);
      setNotice(
        `The saved mapping for ${connection.database} is no longer on the server. Verify the connection to rebuild it.`,
      );
      setStep(2);
    } catch (e) {
      setSelectedDb(engine);
      setConnectionString(connection.connectionString);
      setError(describeError(e));
      setStep(2);
    } finally {
      setResumingId(null);
    }
  };

  const handleForget = (connection: SavedConnection) => {
    setSaved(forgetConnection(connection.id));
  };

  /** Reflects the real schema, then asks the LLM to map it onto the standard model. */
  const handleVerify = async () => {
    if (!selectedDb) return;

    setError(null);
    setNotice(null);
    setIsVerifying(true);

    try {
      const tables = await inspectDatabase(connectionString);
      setLegacySchema(tables);
      setStep(3);

      setIsMapping(true);
      try {
        setManifest(await suggestMapping(selectedDb.id, tables));
      } finally {
        setIsMapping(false);
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setIsVerifying(false);
    }
  };

  /** Persists the approved mapping and hands the connection to the inventory assistant. */
  const handleApprove = async () => {
    if (!manifest || !selectedDb) return;

    setError(null);
    setIsSaving(true);

    try {
      await saveManifest(manifest, connectionString);
      saveConnectionString(connectionString);
      // Remembered only once approved, so the list never offers a database
      // whose mapping was never finished.
      rememberConnection({
        engineId: selectedDb.id,
        engineName: selectedDb.name,
        connectionString,
      });
      navigate('/chat');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setIsSaving(false);
    }
  };

  const mappedTables = manifest ? Object.entries(manifest.tables) : [];
  const mappedColumnCount = mappedTables.reduce(
    (total, [, table]) => total + Object.keys(table.columns).length,
    0,
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8 md:py-10">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="label mb-1.5">Onboarding</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">Bridge your database</h1>
          </div>
          <Stepper step={step} />
        </div>

        {/* Returning users land here, so the shortcut past onboarding comes first. */}
        {step === 1 && saved.length > 0 && (
          <section className="mb-10 animate-fade-rise">
            {/* Kept adjacent rather than justified apart: with one saved card the
                hint would otherwise sit stranded at the far edge of the grid. */}
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="label flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-primary" />
                Saved connections
              </p>
              <p className="text-xs text-ink-muted">
                Already mapped — reconnect without onboarding again.
              </p>
            </div>

            <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((connection, i) => {
                const engine = DB_TYPES.find((db) => db.id === connection.engineId);
                const isResuming = resumingId === connection.id;

                return (
                  <li
                    key={connection.id}
                    style={{ ['--i' as string]: i }}
                    className="animate-fade-rise"
                  >
                    <div className="card group flex h-full flex-col gap-3 p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-soft">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-surface-sunken">
                          <EngineGlyph db={engine} className="h-4 w-4 text-primary" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold" title={connection.database}>
                            {connection.database}
                          </p>
                          <p
                            className="truncate font-mono text-[11px] text-ink-muted"
                            title={connection.server || connection.engineName}
                          >
                            {connection.server || connection.engineName}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleForget(connection)}
                          disabled={isResuming}
                          className="rounded-md p-1.5 text-ink-faint opacity-0 transition-all hover:bg-surface-sunken hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Forget ${connection.database}`}
                          title="Forget this connection"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-ink-faint">
                          {describeLastUsed(connection.lastUsedAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleResume(connection)}
                          disabled={resumingId !== null}
                          className="btn-quiet !py-1.5 text-[13px] font-semibold"
                        >
                          {isResuming ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Connecting…
                            </>
                          ) : (
                            <>
                              Connect
                              <ArrowRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ---------------------------------------------------------- Step 1 */}
        {step === 1 && (
          <div className="grid animate-fade-rise grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <span className="chip mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI schema mapping
              </span>

              <h2 className="text-balance font-display text-display-lg font-extrabold">
                Bridge your{' '}
                <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                  legacy infrastructure
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-ink-muted md:text-lg">
                Point us at the database you already have. The mapping engine reads your real
                schema — whatever your tables and columns are called — and bridges it to the
                standard model, so the agent can answer questions in plain English.
              </p>

              <dl className="mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Workflow, label: 'Schema-agnostic', copy: 'No renaming required' },
                  { icon: ShieldCheck, label: 'Read then confirm', copy: 'You approve the map' },
                  { icon: Zap, label: 'Dialect-neutral', copy: 'One code path' },
                ].map(({ icon: Icon, label, copy }, i) => (
                  <div
                    key={label}
                    className="card animate-fade-rise p-4"
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                  >
                    <Icon className="mb-2.5 h-4 w-4 text-primary" />
                    <dt className="text-[13px] font-semibold leading-tight">{label}</dt>
                    <dd className="mt-0.5 text-xs text-ink-muted">{copy}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <p className="label mb-3">Choose an engine</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {DB_TYPES.map((db, i) => (
                  <button
                    key={db.id}
                    type="button"
                    onClick={() => handleDbSelect(db)}
                    disabled={!db.isSupported}
                    aria-label={
                      db.isSupported ? `Connect to ${db.name}` : `${db.name} — coming soon`
                    }
                    className={`group card relative animate-fade-rise overflow-hidden p-5 text-left transition-all duration-300 ${
                      db.isSupported
                        ? 'hover:-translate-y-1 hover:border-primary/50 hover:shadow-lift'
                        : 'cursor-not-allowed opacity-60'
                    }`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {db.isSupported && (
                      <span
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-accent transition-transform duration-300 group-hover:scale-x-100"
                      />
                    )}

                    <div className="mb-4 flex items-start justify-between">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-[10px] bg-surface-sunken transition-transform duration-300 ${
                          db.isSupported ? 'group-hover:scale-110' : ''
                        }`}
                      >
                        <EngineGlyph db={db} className="h-5 w-5 text-primary" />
                      </span>
                      {!db.isSupported && (
                        <span className="rounded-pill bg-surface-sunken px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                          Soon
                        </span>
                      )}
                    </div>

                    <h3
                      className={`font-display text-[15px] font-bold transition-colors ${
                        db.isSupported ? 'group-hover:text-primary' : ''
                      }`}
                    >
                      {db.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {db.isSupported ? 'Native SQL support' : 'Pipeline integration'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- Step 2 */}
        {step === 2 && selectedDb && (
          <div className="mx-auto max-w-2xl animate-scale-in">
            <div className="card overflow-hidden">
              <div className="flex items-center gap-4 border-b border-line bg-surface-sunken/60 px-6 py-5 md:px-8">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] bg-surface shadow-soft">
                  <EngineGlyph db={selectedDb} className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold">Configure connection</h2>
                  <p className="text-sm text-ink-muted">Targeting {selectedDb.name}</p>
                </div>
              </div>

              <form
                className="space-y-6 px-6 py-6 md:px-8 md:py-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleVerify();
                }}
              >
                <div className="space-y-2">
                  <label htmlFor="connection-string" className="label">
                    Connection string
                  </label>
                  <div className="relative">
                    <input
                      id="connection-string"
                      type="text"
                      value={connectionString}
                      onChange={(e) => setConnectionString(e.target.value)}
                      className="field pr-11 font-mono text-[13px]"
                      placeholder="dialect+driver://user:pass@host:port/db"
                      spellCheck={false}
                      autoComplete="off"
                      autoFocus
                      disabled={isVerifying}
                      aria-describedby="connection-help"
                    />
                    <Server
                      aria-hidden
                      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                    />
                  </div>
                  <p id="connection-help" className="flex items-start gap-1.5 text-xs text-ink-muted">
                    <ShieldCheck className="mt-px h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    Used to read your schema and run the agent's queries. It is held per tenant and
                    never written into the bundle.
                  </p>
                </div>

                {notice && (
                  <div className="notice-warning animate-fade-rise" role="status">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p className="min-w-0 break-words">{notice}</p>
                  </div>
                )}

                {error && (
                  <div className="notice-danger animate-fade-rise" role="alert">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold">Could not reach that database</p>
                      <p className="mt-0.5 break-words opacity-90">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isVerifying}
                    className="btn-ghost"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying || !connectionString.trim()}
                    className="btn-primary sm:min-w-[200px]"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Inspecting schema…
                      </>
                    ) : (
                      <>
                        Verify connection
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- Step 3 */}
        {step === 3 && (
          <div className="animate-fade-rise space-y-5">
            <div className="card flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary/12 text-primary">
                  {isMapping ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold">
                    {isMapping ? 'Building the semantic bridge…' : 'Semantic bridge ready'}
                  </h2>
                  <p className="mt-0.5 max-w-2xl text-sm text-ink-muted">
                    {isMapping
                      ? `Reading ${legacySchema.length} legacy tables and matching them to the standard model.`
                      : `Mapped ${mappedTables.length} of ${legacySchema.length} tables and ${mappedColumnCount} columns. Review the bridge, then approve it.`}
                  </p>
                </div>
              </div>

              <button
                onClick={handleApprove}
                disabled={isMapping || isSaving || !manifest}
                className="btn-primary flex-shrink-0 md:min-w-[190px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Approve &amp; finalize
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="notice-danger animate-fade-rise" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">Could not save the mapping</p>
                  <p className="mt-0.5 break-words opacity-90">{error}</p>
                </div>
              </div>
            )}

            {/* Canvas for the shape of the bridge, list for the detail. */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
              <div className="card relative h-[clamp(420px,58vh,700px)] overflow-hidden p-0">
                {isMapping && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-canvas/75 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-ink-muted">
                      The mapping engine is reasoning over your schema…
                    </p>
                  </div>
                )}
                <MappingCanvas manifest={manifest} />
              </div>

              <aside className="card flex h-[clamp(420px,58vh,700px)] flex-col overflow-hidden">
                <header className="flex items-center gap-2 border-b border-line px-5 py-4">
                  <Table2 className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-sm font-bold">Mapped tables</h3>
                  {!isMapping && (
                    <span className="ml-auto font-mono text-[11px] text-ink-muted">
                      {mappedTables.length}
                    </span>
                  )}
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                  {isMapping &&
                    [0, 1].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="skeleton h-4 w-1/2" />
                        <div className="skeleton h-3 w-full" />
                        <div className="skeleton h-3 w-4/5" />
                      </div>
                    ))}

                  {!isMapping &&
                    mappedTables.map(([logicalName, table], i) => (
                      <section
                        key={logicalName}
                        className="animate-slide-left"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <h4 className="font-display text-sm font-bold capitalize">{logicalName}</h4>
                          <code className="truncate font-mono text-[11px] text-ink-muted">
                            {table.physical_name}
                          </code>
                        </div>
                        <ul className="space-y-1">
                          {Object.entries(table.columns).map(([logicalCol, column]) => (
                            <li
                              key={logicalCol}
                              className="flex items-center gap-2 rounded-md bg-surface-sunken px-2.5 py-1.5 text-[11px]"
                            >
                              <span className="font-medium text-ink">{logicalCol}</span>
                              <ArrowRight className="h-3 w-3 flex-shrink-0 text-primary" />
                              <code className="truncate font-mono text-ink-muted">
                                {column.physical_name}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}

                  {!isMapping && mappedTables.length === 0 && (
                    <p className="text-sm text-ink-muted">
                      No tables were mapped. Check that the connection points at the right schema.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
