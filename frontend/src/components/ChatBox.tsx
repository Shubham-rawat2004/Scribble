import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, CheckCircle2, Lock } from 'lucide-react';
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
          messages.map((msg, index) => {
            const isEven = index % 2 === 0;
            const defaultRowBg = isEven ? '#ffffff' : '#f8fafc';

            // 1. Drawer Announcement: "Rahul is drawing now!" (Screenshot 4)
            if (msg.type === 'DRAWER_ANNOUNCEMENT') {
              return (
                <div
                  key={msg.id}
                  style={{
                    color: '#2563eb',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    padding: '0.3rem 0.55rem',
                    backgroundColor: defaultRowBg,
                    lineHeight: 1.35,
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            // 2. Word Reveal: "The word was 'radiation'" (Screenshot 4)
            if (msg.type === 'WORD_REVEAL') {
              return (
                <div
                  key={msg.id}
                  style={{
                    color: '#16a34a',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    padding: '0.3rem 0.55rem',
                    backgroundColor: defaultRowBg,
                    lineHeight: 1.35,
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            // 3. Guessed the word: "Shubham Rawat guessed the word!" (Screenshot 4)
            if (msg.type === 'SUCCESS') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    fontWeight: 800,
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.9rem',
                    lineHeight: 1.35,
                  }}
                >
                  <span>{msg.text}</span>
                </div>
              );
            }

            // 4. Self celebration for the solver
            if (msg.type === 'SELF_SUCCESS') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    borderRadius: '4px',
                    lineHeight: 1.35,
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            // 5. Room owner notification (Screenshot 4)
            if (msg.type === 'ROOM_OWNER') {
              return (
                <div
                  key={msg.id}
                  style={{
                    color: '#ea580c',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    padding: '0.3rem 0.55rem',
                    backgroundColor: defaultRowBg,
                    lineHeight: 1.35,
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            // 6. Close hint / warning
            if (msg.type === 'CLOSE_HINT') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 700,
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.85rem',
                    borderLeft: '3px solid #f59e0b',
                    lineHeight: 1.35,
                  }}
                >
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
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.85rem',
                    borderLeft: '3px solid #ef4444',
                    lineHeight: 1.35,
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            // 7. Solved Guesser Chat
            if (msg.type === 'GUESSED_CHAT') {
              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: defaultRowBg,
                    color: '#15803d',
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.88rem',
                    wordBreak: 'break-word',
                    lineHeight: 1.35,
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>{msg.senderName}: </span>
                  <span style={{ fontWeight: 600 }}>{msg.text}</span>
                </div>
              );
            }

            // 8. Player Join / Left
            if (msg.type === 'PLAYER_JOINED') {
              return (
                <div
                  key={msg.id}
                  style={{
                    color: '#16a34a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '0.25rem 0.55rem',
                    backgroundColor: defaultRowBg,
                    lineHeight: 1.35,
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            if (msg.type === 'PLAYER_LEFT') {
              return (
                <div
                  key={msg.id}
                  style={{
                    color: '#b91c1c',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '0.25rem 0.55rem',
                    backgroundColor: defaultRowBg,
                    lineHeight: 1.35,
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            // 9. Standard Guess / Chat Message (Screenshot 4: "Tushar: beabsd")
            return (
              <div
                key={msg.id}
                style={{
                  backgroundColor: defaultRowBg,
                  color: '#0f172a',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.9rem',
                  wordBreak: 'break-word',
                  lineHeight: 1.35,
                }}
              >
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{msg.senderName}: </span>
                <span style={{ fontWeight: 600 }}>{msg.text}</span>
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
