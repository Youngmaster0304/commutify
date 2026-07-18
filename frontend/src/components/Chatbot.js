import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../api';

function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    // Strip LaTeX math syntax the AI sometimes outputs
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\$\\to\$/g, '→')
    .replace(/\$\\leftarrow\$/g, '←')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\to\b/g, '→')
    .replace(/\\cdot/g, '·')
    .replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')  // strip remaining $ math wrappers
    // Markdown formatting
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px;font-family:monospace">$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h4 style="margin:8px 0 4px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:10px 0 4px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:12px 0 6px">$1</h2>')
    // Bullet points (numbered and unordered)
    .replace(/^(\d+)\. (.+)$/gm, '<div style="margin:3px 0"><span style="font-weight:700;color:var(--accent)">$1.</span> $2</div>')
    .replace(/^[-•*] (.+)$/gm, '<div style="margin:3px 0"><span style="color:var(--accent);margin-right:6px">•</span>$1</div>')
    // Line breaks
    .replace(/\n/g, '<br/>');
  return html;
}

const QUICK_PROMPTS = [
  'Cheapest way from Rajiv Chowk to IGI Airport?',
  'Is Yellow Line crowded at 9am?',
  'How does smart card save money?',
  'Best route to Noida from Dwarka?',
];

export default function Chatbot({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hey — I'm Commutify AI. Ask me anything about Delhi metro, routes, fares, or crowds.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply || 'Sorry, something went wrong.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: '⚠️ Could not connect to the assistant. Is the server running?' }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        className="chatbot-fab-btn" 
        onClick={() => setIsOpen(!isOpen)} 
        title="Chat with Commutify AI"
      >
        {isOpen ? (
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--yellow-accent)' }}>✕</span>
        ) : (
          <span style={{ fontSize: '22px' }}>🤖</span>
        )}
      </button>

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="chatbot-box">
          <div className="chat-header">
            <div className="chat-header-user">
              <div className="chat-avatar">🤖</div>
              <div className="chat-title-group">
                <span className="chat-title-main">Commutify AI</span>
                <span className="chat-status-mono" style={{ fontSize: '9px', opacity: 0.6 }}>Powered by Claude Sonnet</span>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chat-body">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble-row ${msg.role}`}>
                {msg.role === 'bot' && <div className="chat-avatar" style={{ width: '24px', height: '24px', fontSize: '11px', flexShrink: 0 }}>🤖</div>}
                <div
                  className="chat-bubble"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                />
              </div>
            ))}
            {loading && (
              <div className="chat-bubble-row bot">
                <div className="chat-avatar" style={{ width: '24px', height: '24px', fontSize: '11px', flexShrink: 0 }}>🤖</div>
                <div className="chat-bubble" style={{ color: 'var(--text-dim-light)' }}>
                  <span>●</span><span>●</span><span>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="chat-quick-prompts">
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} className="chat-quick-prompt-btn" onClick={() => sendMessage(p)}>
                  {p}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-bar">
            <input
              ref={inputRef}
              type="text"
              className="chat-input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about routes, fares, crowds..."
              disabled={loading}
            />
            <button 
              className="chat-send-btn" 
              onClick={() => sendMessage()} 
              disabled={loading || !input.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
