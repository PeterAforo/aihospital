import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiService } from '../../../services/ai.service';
import { MessageSquare, Send, Loader2, Bot, User } from 'lucide-react';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (msg: string) => aiService.chat(messages, msg),
    onSuccess: (data: any) => {
      const resp = data?.data?.response || 'Sorry, I could not generate a response.';
      setMessages(prev => [...prev, { role: 'assistant', content: resp }]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || mutation.isPending) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    mutation.mutate(msg);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', minHeight: 400 }}>
        {/* Header */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare style={{ width: 20, height: 20 }} />
            <div>
              <p style={{ fontWeight: 600, margin: 0, fontSize: '0.9375rem' }}>SmartMed AI Assistant</p>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Ask me about appointments, services, health info</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              <Bot style={{ width: 48, height: 48, margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 500, marginBottom: 4 }}>Welcome to SmartMed AI Assistant</p>
              <p style={{ fontSize: '0.8125rem' }}>Try asking about appointments, NHIS coverage, visiting hours, or general health questions.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot style={{ width: 14, height: 14, color: 'white' }} />
                </div>
              )}
              <div style={{
                maxWidth: '75%', padding: '0.625rem 0.875rem', borderRadius: 12, fontSize: '0.875rem', lineHeight: 1.5,
                background: m.role === 'user' ? '#6366f1' : '#f3f4f6',
                color: m.role === 'user' ? 'white' : '#374151',
                borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
              {m.role === 'user' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User style={{ width: 14, height: 14, color: '#6b7280' }} />
                </div>
              )}
            </div>
          ))}
          {mutation.isPending && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot style={{ width: 14, height: 14, color: 'white' }} />
              </div>
              <div style={{ padding: '0.625rem 0.875rem', borderRadius: 12, background: '#f3f4f6', fontSize: '0.875rem', color: '#6b7280' }}>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            style={{ flex: 1, padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem' }} />
          <button onClick={handleSend} disabled={!input.trim() || mutation.isPending}
            style={{ padding: '0.625rem 1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Send style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
