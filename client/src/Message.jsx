import { motion } from 'motion/react';

export function Message({ role, text, streaming, model }) {
  const label = role === 'user' ? 'YOU' : role === 'error' ? 'ERR' : 'BASE';
  return (
    <motion.div
      className={`msg ${role}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={styles.msg}
    >
      <div style={{ ...styles.role, color: role === 'user' ? 'var(--amber)' : role === 'error' ? 'var(--red)' : 'var(--green)' }}>
        {label}
      </div>
      <div style={{ ...styles.body, ...bodyVariant(role) }}>
        {model && role === 'assistant' && (
          <div style={styles.modelTag}>{model}</div>
        )}
        {text}
        {streaming && <span style={styles.cursor} />}
      </div>
    </motion.div>
  );
}

function bodyVariant(role) {
  if (role === 'user')  return { background: 'rgba(245,200,66,0.05)',  borderColor: 'var(--amber)',   color: '#d4b96e' };
  if (role === 'error') return { background: 'rgba(255,85,85,0.06)',   borderColor: 'var(--red)',     color: '#ff8888' };
  return                       { background: 'rgba(82,232,122,0.04)',  borderColor: 'var(--green-dim)', color: 'var(--text)' };
}

const styles = {
  msg: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr',
    gap: '0 16px',
  },
  role: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    paddingTop: 14,
    textAlign: 'right',
    fontFamily: "'Fira Code', monospace",
  },
  body: {
    padding: '10px 16px',
    borderRadius: 2,
    borderLeft: '2px solid transparent',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  modelTag: {
    fontSize: 10,
    color: 'var(--green-dim)',
    letterSpacing: '0.08em',
    marginBottom: 6,
    fontWeight: 500,
  },
  cursor: {
    display: 'inline-block',
    width: 7,
    height: 13,
    background: 'var(--green)',
    verticalAlign: 'text-bottom',
    marginLeft: 2,
    animation: 'cursorBlink 0.8s step-end infinite',
  },
};
