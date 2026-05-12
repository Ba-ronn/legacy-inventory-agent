import React, { useState } from 'react';
import MappingCanvas from '../components/MappingCanvas';
import { Database, Link, ArrowRight, Sparkles, Server, HardDrive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DB_TYPES = [
  { id: 'postgresql', name: 'PostgreSQL', prefix: 'postgresql+asyncpg://', icon: Database, isSupported: true },
  { id: 'mysql', name: 'MySQL', prefix: 'mysql+aiomysql://', icon: Server, isSupported: true },
  { id: 'sqlserver', name: 'SQL Server', prefix: 'mssql+aioodbc://', icon: HardDrive, isSupported: true },
  { id: 'sqlite', name: 'SQLite', prefix: 'sqlite+aiosqlite:///', icon: Database, isSupported: true },
  { id: 'mongodb', name: 'MongoDB', prefix: 'mongodb://', icon: Server, isSupported: false },
  { id: 'dynamodb', name: 'DynamoDB', prefix: 'dynamodb://', icon: HardDrive, isSupported: false },
];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDb, setSelectedDb] = useState<typeof DB_TYPES[0] | null>(null);
  const [connectionString, setConnectionString] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleDbSelect = (db: typeof DB_TYPES[0]) => {
    if (!db.isSupported) {
      setInfoMessage(`${db.name} integration is currently under development. Please select a SQL database for now.`);
      return;
    }
    setInfoMessage(null);
    setSelectedDb(db);
    setConnectionString(db.prefix);
    setStep(2);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API delay for dramatic effect
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-background text-text flex flex-col font-inter overflow-hidden">
      
      {/* Decorative Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full py-6 px-10 border-b border-white/5 bg-background/40 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg shadow-lg shadow-primary/20 animate-pulse-glow">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-outfit font-bold tracking-tight text-white">
              Agentic <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Inventory</span>
            </h1>
          </div>
          <div className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-text-muted font-medium flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
            </span>
            System Online
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col p-8 max-w-7xl mx-auto w-full">
        
        {/* Step 1: Database Selection */}
        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-700">
            <div className="text-center mb-12 max-w-2xl">
              <h2 className="text-5xl font-outfit font-extrabold mb-4 leading-tight">
                Select your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-text-muted">Database Engine</span>
              </h2>
              <p className="text-lg text-text-muted">
                Choose the underlying database technology hosting your legacy inventory system. We support all major dialects.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl animate-float">
              {DB_TYPES.map((db) => {
                const Icon = db.icon;
                return (
                  <button
                    key={db.id}
                    onClick={() => handleDbSelect(db)}
                    className="glass-card flex flex-col items-center justify-center p-8 gap-4 hover:bg-white/10 transition-all duration-300 group hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(0,141,213,0.2)] border border-white/5 hover:border-primary/50"
                  >
                    <div className="p-4 bg-surface_light/50 rounded-full group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-10 h-10 text-primary group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-xl font-outfit font-semibold text-white">{db.name}</span>
                  </button>
                );
              })}
            </div>

            {infoMessage && (
              <div className="mt-8 p-4 bg-secondary/10 border border-secondary text-white rounded-xl animate-in fade-in flex items-center gap-3 max-w-2xl text-center shadow-[0_0_15px_rgba(223,59,87,0.2)]">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-secondary" />
                <p>{infoMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Connection String */}
        {step === 2 && selectedDb && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-10 max-w-2xl">
              <h2 className="text-5xl font-outfit font-extrabold mb-4 leading-tight">
                Connect your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-text-muted">Legacy Infrastructure</span>
              </h2>
              <p className="text-lg text-text-muted">
                Our AI-driven mapping engine will analyze your {selectedDb.name} schema and automatically bridge it to the Agentic Inventory System standard model.
              </p>
            </div>

            <div className="glass-card w-full max-w-xl p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-outfit font-semibold flex items-center gap-3 text-white">
                  <Link className="w-5 h-5 text-primary" /> {selectedDb.name} Connection
                </h3>
                <button 
                  onClick={() => setStep(1)} 
                  className="text-sm text-text-muted hover:text-white transition-colors underline"
                >
                  Change Database
                </button>
              </div>
              
              <form onSubmit={handleConnect} className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm text-text-muted mb-3 font-medium uppercase tracking-wider">Connection String URL</label>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-0 group-focus-within:opacity-30 transition duration-500 blur"></div>
                    <input
                      type="text"
                      value={connectionString}
                      onChange={(e) => setConnectionString(e.target.value)}
                      className="glow-input relative w-full"
                      required
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-3">
                    Ensure you include credentials and the database name (e.g., {selectedDb.prefix}user:pass@localhost:5432/db).
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary mt-2 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 animate-spin" /> Extracting Metadata...
                    </span>
                  ) : (
                    <>
                      Initialize Discovery <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 3: Semantic Workspace */}
        {step === 3 && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-700">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-outfit font-bold flex items-center gap-3">
                  <Sparkles className="text-primary w-6 h-6" /> Semantic Mapping Workspace
                </h2>
                <p className="text-text-muted mt-2 text-lg">Review and approve the AI-suggested semantic bridge.</p>
              </div>
              <button 
                onClick={() => navigate('/chat')}
                className="relative overflow-hidden bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-outfit font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-2"
              >
                Approve & Finalize
              </button>
            </div>
            
            {/* The React Flow Canvas Container */}
            <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl relative border border-white/10 glass-card p-2 min-h-[500px]">
              <MappingCanvas />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Onboarding;
