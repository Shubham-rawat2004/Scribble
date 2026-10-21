import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, CheckCircle2, Sparkles, AlertTriangle, Crown, UserPlus, UserMinus, Lock } from 'lucide-react';
import { ChatMessage } from '../types/game';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isDrawer: boolean;
  hasGuessed: boolean;
  isDrawingPhase: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  isDrawer,
  hasGuessed,
  isDrawingPhase,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isDrawerDrawing = isDrawer && isDrawingPhase;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDrawerDrawing) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  // Determine placeholder context
  let placeholder = 'Type your guess here...';
  if (isDrawerDrawing) {
    placeholder = 'You cannot chat while drawing!';
  } else if (hasGuessed && isDrawingPhase) {
    placeholder = 'Chat with other guessers...';
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '3px solid #1e293b',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.95rem',
          letterSpacing: '0.025em',
          borderBottom: '2px solid #0369a1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={18} />
          <span>Game Chat</span>
        </div>
        {hasGuessed && isDrawingPhase && (
          <span
            style={{
              fontSize: '0.75rem',
              backgroundColor: '#10b981',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <CheckCircle2 size={13} /> Guessed
          </span>
        )}
      </div>

      {/* Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          backgroundColor: '#f8fafc',
          maxHeight: '420px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.85rem',
              margin: 'auto 0',
              fontStyle: 'italic',
            }}
          >
            Match chat started! Guesses will appear here.
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'SUCCESS') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    fontWeight: 700,
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    borderLeft: '4px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Sparkles size={15} color="#059669" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'SELF_SUCCESS') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            if (msg.type === 'CLOSE_HINT') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 700,
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    borderLeft: '4px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <AlertTriangle size={15} color="#d97706" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'WARNING') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: 700,
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    borderLeft: '4px solid #ef4444',
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            if (msg.type === 'GUESSED_CHAT') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    wordBreak: 'break-word',
                    border: '1px solid #bbf7d0',
                    boxShadow: '0 1px 2px rgba(16, 185, 129, 0.08)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontWeight: 800,
                      marginRight: '0.4rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    GUESSER
                  </span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>{msg.senderName}: </span>
                  <span style={{ fontWeight: 600, color: '#15803d' }}>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'ROOM_OWNER') {
              return (
                <div
                  key={msg.id}
                  style={{
                    color: '#ea580c',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    padding: '0.35rem 0.5rem',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    lineHeight: 1.3,
                  }}
                >
                  <Crown size={15} color="#ea580c" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'SYSTEM_INFO') {
              const isCopyLink = msg.text.toLowerCase().includes('copied');
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: isCopyLink ? '#fef9c3' : 'transparent',
                    color: isCopyLink ? '#854d0e' : '#c2410c',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    border: isCopyLink ? '1px solid #fef08a' : 'none',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {isCopyLink && <CheckCircle2 size={14} color="#854d0e" />}
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'PLAYER_JOINED') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <UserPlus size={14} color="#15803d" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'PLAYER_LEFT') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <UserMinus size={14} color="#b91c1c" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            // Normal CHAT or SYSTEM
            return (
              <div
                key={msg.id}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span style={{ fontWeight: 800, color: '#2563eb' }}>{msg.senderName}: </span>
                <span>{msg.text}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.65rem 0.75rem',
          backgroundColor: '#ffffff',
          borderTop: '2px solid #e2e8f0',
        }}
      >
        <input
          type="text"
          value={isDrawerDrawing ? '' : inputText}
          onChange={(e) => !isDrawerDrawing && setInputText(e.target.value)}
          placeholder={placeholder}
          disabled={isDrawerDrawing}
          maxLength={120}
          style={{
            flex: 1,
            padding: '0.55rem 0.85rem',
            borderRadius: '10px',
            border: isDrawerDrawing ? '2px solid #e2e8f0' : '2px solid #cbd5e1',
            fontSize: '0.875rem',
            outline: 'none',
            fontWeight: 600,
            color: isDrawerDrawing ? '#94a3b8' : '#1e293b',
            backgroundColor: isDrawerDrawing ? '#f1f5f9' : '#ffffff',
            cursor: isDrawerDrawing ? 'not-allowed' : 'text',
          }}
        />
        <button
          type="submit"
          disabled={isDrawerDrawing || !inputText.trim()}
          title={isDrawerDrawing ? 'You cannot chat while drawing!' : 'Send'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.55rem 0.95rem',
            borderRadius: '10px',
            backgroundColor: (!isDrawerDrawing && inputText.trim()) ? '#0284c7' : '#cbd5e1',
            color: '#ffffff',
            border: 'none',
            cursor: (!isDrawerDrawing && inputText.trim()) ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.15s',
          }}
        >
          {isDrawerDrawing ? <Lock size={16} /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
};
