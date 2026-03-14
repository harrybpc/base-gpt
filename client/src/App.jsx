import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Message } from './Message';
import { useWebSocket } from './useWebSocket';

const MODEL = 'llama3.2:1b';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const streamingIdRef = useRef(null);

  const handleMessage = useCallback((msg) => {
    if (msg.error) {
      finishStream();
      setMessages(prev => [...prev, { id: Date.now(), role: 'error', text: msg.error }]);
      return;
    }
    if (msg.token) {
      setMessages(prev => prev.map(m =>
        m.id === streamingIdRef.current ? { ...m, text: m.text + msg.token } : m
      ));
      setTokenCount(n => n + 1);
    }
    if (msg.done) finishStream();
  }, []);

  const { status, send } = useWebSocket(handleMessage);

  function finishStream() {
    streamingIdRef.current = null;
    setStreaming(false);
    setMessages(prev => prev.map(m => ({ ...m, streaming: false })));
  }

  function handleSend() {
    const prompt = input.trim();
    if (!prompt || status !== 'connected' || streaming) return;

    const assistantId = Date.now() + 1;
    streamingIdRef.current = assistantId;
    setStreaming(true);
    setMessages(prev => [
      ...prev,
      { id: Date.now(),    role: 'user',      text: prompt, streaming: false },
      { id: assistantId,   role: 'assistant',  text: '',     streaming: true  },
    ]);
    send({ prompt });
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleClear() {
    setMessages([]);
    setTokenCount(0);
    setStreaming(false);
    streamingIdRef.current = null;
  }

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const canSend = status === 'connected' && !streaming && input.trim().length > 0;

  return (
    <div style={s.app}>
      <header style={s.header}>
        <span style={s.logo}>BASE GPT</span>
        <div style={s.headerMeta}>
          <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{MODEL}</span>
          <StatusIndicator status={status} />
          <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{tokenCount} tokens</span>
        </div>
      </header>

      <div style={s.messages}>
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div key="empty" style={s.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={s.emptyLogo}>BASE</div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-dim)' }}>send a prompt to begin</div>
            </motion.div>
          ) : (
            messages.map(m => <Message key={m.id} role={m.role} text={m.text} streaming={m.streaming} />)
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div style={s.inputBar}>
        <div style={s.inputRow}>
          <span style={s.prefix}>&gt;</span>
          <textarea
            ref={textareaRef}
            style={s.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="enter prompt..."
            rows={1}
            disabled={status !== 'connected'}
          />
          <button style={{ ...s.sendBtn, ...(canSend ? {} : s.sendBtnDisabled) }} onClick={handleSend} disabled={!canSend}>
            SEND ↵
          </button>
        </div>
      </div>

      <footer style={s.footer}>
        <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>ws://localhost:8080</span>
        <button style={s.clearBtn} onClick={handleClear}>[ clear ]</button>
      </footer>

      <style>{`
        @keyframes cursorBlink { 50% { opacity: 0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes blink { 50% { opacity:0; } }
        textarea { outline: none !important; }
        textarea::placeholder { color: var(--text-dim); }
      `}</style>
    </div>
  );
}

function StatusIndicator({ status }) {
  const color = status === 'connected' ? 'var(--green)' : status === 'connecting' ? 'var(--amber)' : 'var(--red)';
  const anim  = status === 'connected' ? 'pulse 2s ease-in-out infinite' : 'blink 0.5s step-end infinite';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: anim,
        boxShadow: status === 'connected' ? '0 0 8px var(--green)' : 'none' }} />
      <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}

const s = {
  app: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    maxWidth: 900, margin: '0 auto',
    borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-panel)', flexShrink: 0,
  },
  logo: {
    fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
    color: 'var(--green)', letterSpacing: '0.15em',
    textShadow: '0 0 20px var(--green-glow)',
  },
  headerMeta: { display: 'flex', alignItems: 'center', gap: 20, fontFamily: "'Fira Code', monospace" },
  messages: {
    flex: 1, overflowY: 'auto', padding: '24px',
    display: 'flex', flexDirection: 'column', gap: 28,
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12, flex: 1, textAlign: 'center', minHeight: '60%',
  },
  emptyLogo: {
    fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800,
    color: 'var(--border-lit)', letterSpacing: '0.2em',
  },
  inputBar: {
    padding: '16px 24px', background: 'var(--bg-panel)',
    borderTop: '1px solid var(--border)', flexShrink: 0,
  },
  inputRow: {
    display: 'flex', alignItems: 'flex-end', gap: 12,
    background: 'var(--bg-input)', border: '1px solid var(--border-lit)',
    borderRadius: 3, padding: '10px 14px',
  },
  prefix: { color: 'var(--green)', fontWeight: 600, flexShrink: 0, paddingBottom: 1, userSelect: 'none' },
  textarea: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#e0ece3', fontFamily: "'Fira Code', monospace", fontSize: 13,
    resize: 'none', minHeight: 20, maxHeight: 120, lineHeight: 1.6,
    caretColor: 'var(--green)',
  },
  sendBtn: {
    flexShrink: 0, background: 'transparent', border: '1px solid var(--green-dim)',
    color: 'var(--green)', fontFamily: "'Fira Code', monospace", fontSize: 11,
    fontWeight: 600, letterSpacing: '0.1em', padding: '5px 12px', borderRadius: 2,
    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
  },
  sendBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 24px 10px', background: 'var(--bg-panel)',
  },
  clearBtn: {
    background: 'none', border: 'none', fontFamily: "'Fira Code', monospace",
    fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer', letterSpacing: '0.08em',
  },
};
