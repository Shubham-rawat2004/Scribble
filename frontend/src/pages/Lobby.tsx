import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { RoomDTO, PlayerDTO, GameSessionDTO, StartGameResponse, ChatMessage } from '../types/game';
import { SkribblAvatar } from '../components/SkribblAvatar';
import { ChatBox } from '../components/ChatBox';
import {
  Users,
  Clock,
  Play,
  Copy,
  Check,
  Share2,
  LogOut,
  Crown,
  Settings,
  AlertCircle,
  Sparkles,
  UserX,
  UserMinus,
  Globe,
} from 'lucide-react';

interface LobbyProps {
  initialRoom: RoomDTO;
  currentPlayer: PlayerDTO;
  onLeaveRoom: () => void;
  onGameStarted: (session: GameSessionDTO, updatedRoom?: RoomDTO) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  initialRoom,
  currentPlayer,
  onLeaveRoom,
  onGameStarted,
}) => {
  const [room, setRoom] = useState<RoomDTO>(initialRoom);
  const [players, setPlayers] = useState<PlayerDTO[]>(initialRoom.players);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isHost = currentPlayer.isHost || room.hostPlayerId === currentPlayer.id;

  // Real-time Chat & Notice Stream
  useEffect(() => {
    // 1. Initial chat history fetch
    socket.emit('get_chat_history', { roomId: room.id }, (res?: { messages: ChatMessage[] }) => {
      if (res?.messages && res.messages.length > 0) {
        setMessages(res.messages);
      }
    });

    const onChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onChatHistory = (data: { roomId: string; messages: ChatMessage[] }) => {
      if (data?.messages) {
        setMessages(data.messages);
      }
    };

    socket.on('chat_message', onChatMessage);
    socket.on('chat_history', onChatHistory);

    return () => {
      socket.off('chat_message', onChatMessage);
      socket.off('chat_history', onChatHistory);
    };
  }, [room.id]);

  useEffect(() => {
    // 1. Listen for new players joining in real time
    const onPlayerJoined = (data: { player: PlayerDTO; players: PlayerDTO[] }) => {
      console.log('[Lobby] player_joined event received:', data.player.name);
      setPlayers(data.players);
      setRoom((prev) => ({ ...prev, players: data.players }));
    };

    // 2. Listen for players leaving in real time
    const onPlayerLeft = (data: { playerId: string; players: PlayerDTO[]; newHostId?: string }) => {
      console.log('[Lobby] player_left event received for ID:', data.playerId);
      setPlayers(data.players);
      if (data.newHostId && data.newHostId === currentPlayer.id) {
        currentPlayer.isHost = true;
      }
    };

    // 3. Listen for game started broadcast
    const onGameStartedEvent = (data: { roomId: string; session: GameSessionDTO; room?: RoomDTO }) => {
      console.log('[Lobby] game_started event received! Session:', data.session.sessionId);
      const updated = data.room || { ...room, players };
      onGameStarted(data.session, updated);
    };

    const onKicked = (data: { reason: string }) => {
      alert(data.reason || 'You were kicked from the room by the host.');
      onLeaveRoom();
    };

    const onCountdown = (data: { countdown: number }) => {
      setAutoStartCountdown(data.countdown);
    };

    const onCountdownCancelled = () => {
      setAutoStartCountdown(null);
    };

    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('start_game', onGameStartedEvent);
    socket.on('game_started', onGameStartedEvent);
    socket.on('kicked', onKicked);
    socket.on('lobby_countdown', onCountdown);
    socket.on('lobby_countdown_cancelled', onCountdownCancelled);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('start_game', onGameStartedEvent);
      socket.off('game_started', onGameStartedEvent);
      socket.off('kicked', onKicked);
      socket.off('lobby_countdown', onCountdown);
      socket.off('lobby_countdown_cancelled', onCountdownCancelled);
    };
  }, [currentPlayer.id, onGameStarted, onLeaveRoom, room, players]);

  const handleSendMessage = (text: string) => {
    socket.emit('send_chat_message', { roomId: room.id, text });
  };

  const handleKickPlayer = (targetPlayerId: string, playerName: string) => {
    if (!window.confirm(`Are you sure you want to kick ${playerName}?`)) return;
    socket.emit(
      'kick_player',
      { roomId: room.id, targetPlayerId },
      (res: { success: boolean; error?: string }) => {
        if (!res.success) {
          setError(res.error || 'Failed to kick player.');
        }
      }
    );
  };

  const handleVoteKick = (targetPlayerId: string, playerName: string) => {
    if (!window.confirm(`Vote to kick ${playerName}?`)) return;
    socket.emit(
      'vote_kick',
      { roomId: room.id, targetPlayerId },
      (res: { success: boolean; error?: string; votes?: number; threshold?: number }) => {
        if (!res.success && res.error) {
          setError(res.error);
        }
      }
    );
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);

    const copyNotice: ChatMessage = {
      id: 'copy-code-' + Date.now(),
      senderId: 'system',
      senderName: 'System',
      text: `Copied room code (${room.id}) to clipboard!`,
      type: 'SYSTEM_INFO',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, copyNotice]);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/?${room.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);

    const copyNotice: ChatMessage = {
      id: 'copy-link-' + Date.now(),
      senderId: 'system',
      senderName: 'System',
      text: 'Copied room link to clipboard!',
      type: 'SYSTEM_INFO',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, copyNotice]);
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      setError('At least 2 players are required to start the game.');
      return;
    }

    setError(null);
    setStarting(true);

    socket.emit('start_game', { roomId: room.id }, (response: StartGameResponse) => {
      setStarting(false);
      if (!response.success) {
        setError(response.error || 'Failed to start game.');
      }
    });
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* Top Banner / Room Header */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Multiplayer Lobby
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.1em' }}>
                {room.id}
              </h2>
              <button
                className="btn btn-outline"
                onClick={copyRoomCode}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {copiedCode ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                className="btn btn-outline"
                onClick={copyInviteLink}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {copiedLink ? <Check size={14} color="#16a34a" /> : <Share2 size={14} />}
                {copiedLink ? 'Copied Link!' : 'Copy Invite Link'}
              </button>
            </div>
          </div>

          <button
            onClick={onLeaveRoom}
            className="btn btn-outline"
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
          >
            <LogOut size={16} /> Leave Room
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Public Match Auto-Start Countdown Banner */}
      {autoStartCountdown !== null && (
        <div
          style={{
            background: '#ecfdf5',
            border: '2px solid #10b981',
            borderRadius: '14px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Sparkles size={22} color="#059669" />
            <span style={{ fontWeight: 800, color: '#065f46', fontSize: '1.05rem' }}>
              Public match auto-starting in <b style={{ fontSize: '1.25rem', color: '#047857' }}>{autoStartCountdown}</b>s...
            </span>
          </div>
          {isHost && (
            <button
              className="btn btn-primary"
              onClick={handleStartGame}
              disabled={starting}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 800,
                backgroundColor: '#059669',
                borderColor: '#047857',
              }}
            >
              Start Immediately ⚡
            </button>
          )}
        </div>
      )}

      {/* Public Match Waiting For Players Banner */}
      {!room.settings.isPrivate && autoStartCountdown === null && players.length < 2 && (
        <div
          style={{
            background: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#1e40af',
            fontSize: '0.92rem',
            fontWeight: 700,
          }}
        >
          <Globe size={18} color="#3b82f6" />
          <span>Public Matchmaking Active! Waiting for another player to join...</span>
        </div>
      )}

      {/* Main Lobby Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left Column: Player Roster & Match Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Player Roster Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="#2563eb" />
                Players Roster
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.85rem' }}>
                {players.length} / {room.settings.maxPlayers} Players
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              {players.map((p) => {
                const isCurrent = p.id === currentPlayer.id;

                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: isCurrent ? '#eff6ff' : '#f8fafc',
                      border: isCurrent ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <SkribblAvatar avatarId={p.avatarId} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#0f172a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.name} {isCurrent && <span style={{ color: '#2563eb', fontSize: '0.8rem' }}>(You)</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                        {p.isHost && (
                          <span
                            className="badge"
                            style={{
                              background: '#fef08a',
                              color: '#854d0e',
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.4rem',
                            }}
                          >
                            <Crown size={11} /> Host
                          </span>
                        )}
                        <span
                          className="badge badge-success"
                          style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
                        >
                          Online
                        </span>
                      </div>
                    </div>

                    {/* Host Kick Player Moderation Control (REQ-NH-06) */}
                    {isHost && !p.isHost && (
                      <button
                        type="button"
                        title={`Kick ${p.name}`}
                        onClick={() => handleKickPlayer(p.id, p.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <UserX size={17} />
                      </button>
                    )}

                    {/* Democratic Votekick for Non-Host Players */}
                    {!isHost && !isCurrent && (
                      <button
                        type="button"
                        title={`Vote to kick ${p.name}`}
                        onClick={() => handleVoteKick(p.id, p.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ea580c',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#ffedd5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <UserMinus size={17} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Zone: Host starts match; guests wait only when not auto-starting */}
            {(isHost || autoStartCountdown === null) && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {isHost ? (
                  <div>
                    <button
                      className="btn btn-primary"
                      onClick={handleStartGame}
                      disabled={starting || players.length < 2}
                      style={{
                        width: '100%',
                        padding: '0.9rem',
                        fontSize: '1.1rem',
                        opacity: players.length < 2 ? 0.6 : 1,
                        cursor: players.length < 2 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Play size={20} />
                      {starting ? 'Starting Game...' : 'Start Game'}
                    </button>
                    {players.length < 2 ? (
                      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                        Waiting for at least 2 players to start...
                      </p>
                    ) : (
                      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600, marginTop: '0.5rem' }}>
                        ✅ Ready! Click "Start Game" when you're ready to begin.
                      </p>
                    )}
                  </div>
                ) : autoStartCountdown !== null ? null : (
                  <div
                    style={{
                      background: '#f1f5f9',
                      padding: '1rem',
                      borderRadius: '10px',
                      textAlign: 'center',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      border: '1.5px solid #cbd5e1',
                    }}
                  >
                    <Clock size={19} className="animate-spin" color="#2563eb" />
                    <span>
                      {players.length < 2 ? (
                        room.settings.isPrivate
                          ? 'Waiting for at least 2 players before host can start...'
                          : 'Waiting for another player to join public match...'
                      ) : (
                        room.settings.isPrivate
                          ? <>Waiting for host (<b>{room.hostName}</b>) to start the game...</>
                          : 'Waiting for match to begin...'
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Match Rules Summary Card */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Settings size={18} color="#64748b" /> Match Rules
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 2 }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Capacity</span>
                <b>{room.settings.maxPlayers} players</b>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Rounds</span>
                <b>{room.settings.totalRounds} rounds</b>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Draw Time</span>
                <b>{room.settings.drawTimeSeconds} seconds</b>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Word Choices</span>
                <b>{room.settings.wordOptionsCount} words</b>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Hints</span>
                <b>{room.settings.hintsAllowed} hints</b>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Room Mode</span>
                <b>{room.settings.isPrivate ? 'Private' : 'Public'}</b>
              </li>
            </ul>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                marginTop: '1.25rem',
                fontSize: '0.78rem',
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              <Sparkles size={14} color="#3b82f6" style={{ display: 'inline', marginRight: '4px' }} />
              Invite friends by sharing your room code <b>{room.id}</b> or send them the invite link directly.
            </div>
          </div>
        </div>

        {/* Right Column: Skribbl Activity & Game Chat */}
        <div style={{ minHeight: '520px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <ChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isDrawer={false}
            hasGuessed={false}
            isDrawingPhase={false}
          />
        </div>
      </div>
    </div>
  );
};
