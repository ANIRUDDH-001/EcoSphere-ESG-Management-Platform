import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { ShieldCheck, Database, Send, AlertTriangle, User, Bot, Loader2 } from 'lucide-react';
import { postCopilot } from '../api';
import type { CopilotMessage } from '../api';

const SUGGESTED_PROMPTS = [
  "What's our ESG score?",
  "Why is governance low?",
  "Top departments"
];

export function CopilotPage() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSend = useRef<number>(0);
  
  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const handleSend = async (text: string) => {
    const now = Date.now();
    if (now - lastSend.current < 500) return; // Debounce 500ms
    if (!text.trim() || pending) return;
    
    lastSend.current = now;
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    
    const userMsg: CopilotMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPending(true);
    
    try {
      const response = await postCopilot(text.trim(), history);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I couldn't process that request at this time.",
        fallback: true
      }]);
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">ESG Copilot</h1>
        <p className="text-sm text-gray-500">Ask questions about your ESG data and metrics.</p>
      </header>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 flex flex-col gap-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Bot className="w-12 h-12 mb-4 text-gray-400" />
            <p className="mb-6 text-center">I'm ready to help you analyze your ESG data.<br/>Try asking one of these:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  disabled={pending}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm rounded-full border border-gray-200 transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-lg p-3 ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-50 border border-gray-200 text-gray-800'
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                
                {m.role === 'assistant' && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    {!m.fallback ? (
                      <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200" title="Grounded">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Grounded</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200" title="Offline Answer">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Offline Answer</span>
                      </div>
                    )}
                    
                    {m.tools && m.tools.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {m.tools.map(t => (
                          <div key={t} className="flex items-center gap-1 text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                            <Database className="w-3 h-3" />
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        
        {pending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-50 border border-gray-200 text-gray-800 flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question..."
          className="flex-1 resize-none h-12 p-3 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm disabled:opacity-50"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={!input.trim() || pending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
