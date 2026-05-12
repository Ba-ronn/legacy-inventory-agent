import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Server } from 'lucide-react';
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'agent',
    content: "Semantic bridge established. I am your Agentic Inventory System assistant. You can ask me to check stock, transfer inventory, or create new fulfillment orders.",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await axios.post('http://localhost:8000/api/v1/chat/query', {
        // We use a hardcoded tenant/connection for Phase 5 E2E testing
        tenant_id: 'test_tenant',
        connection_string: 'sqlite+aiosqlite:///./test_inventory.db',
        query: userMsg.content
      });

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: response.data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: "Error: Could not connect to the Agentic orchestrator. Ensure backend is running.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-text flex flex-col font-inter overflow-hidden">
      
      {/* Decorative Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full py-4 px-8 border-b border-white/5 bg-background/40 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-outfit font-bold tracking-tight text-white">
              Agentic <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Terminal</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium flex items-center gap-2 shadow-[0_0_10px_rgba(0,141,213,0.2)]">
              <Server className="w-3 h-3" />
              Connected: test_tenant
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 md:p-8 overflow-hidden h-[calc(100vh-80px)]">
        <div className="glass-card flex-1 flex flex-col overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border-white/10">
          
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                    msg.role === 'user' 
                      ? 'bg-surface_light border border-white/10 text-white' 
                      : 'bg-gradient-to-br from-primary to-secondary text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`px-6 py-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-[#2a3040] text-white rounded-tr-sm border border-white/5'
                      : 'bg-[#1b1b1e]/80 text-text rounded-tl-sm border border-primary/20 shadow-[0_0_15px_rgba(0,141,213,0.05)]'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[10px] text-text-muted mt-2 block opacity-50 uppercase tracking-widest">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-4 max-w-[80%]">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white shadow-lg animate-pulse-glow">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="px-6 py-4 rounded-2xl bg-[#1b1b1e]/80 rounded-tl-sm border border-primary/20 flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#1b1b1e]/90 border-t border-white/5 backdrop-blur-xl">
            <form onSubmit={handleSend} className="relative flex items-center max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about inventory, transfer stock, or create an order..."
                className="w-full bg-[#050505]/50 border border-white/10 text-white rounded-2xl pl-6 pr-16 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 placeholder:text-white/30 text-lg shadow-inner"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-3 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </form>
            <div className="text-center mt-3">
              <span className="text-xs text-text-muted flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" /> Powered by LangGraph & SQLAlchemy Core
              </span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Chat;
