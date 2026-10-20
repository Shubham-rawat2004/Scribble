import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { RoomDTO, PlayerDTO, GameSessionDTO, StartGameResponse } from '../types/game';
import { SkribblAvatar } from '../components/SkribblAvatar';
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
} from 'lucide-react';

interface LobbyProps {
  initialRoom: RoomDTO;
  currentPlayer: PlayerDTO;
  onLeaveRoom: () => void;
  onGameStarted: (session: GameSessionDTO) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  initialRoom,
  currentPlayer,
  onLeaveRoom,
  onGameStarted,
}) => {
  const [room, setRoom] = useState<RoomDTO>(initialRoom);
  const [players, setPlayers] = useState<PlayerDTO[]>(initialRoom.players);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isHost = currentPlayer.isHost || room.hostPlayerId === currentPlayer.id;

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
    const onGameStartedEvent = (data: { roomId: string; session: GameSessionDTO }) => {
      console.log('[Lobby] game_started event received! Session:', data.session.sessionId);
      onGameStarted(data.session);
    };

    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('start_game', onGameStartedEvent);
    socket.on('game_started', onGameStartedEvent);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('start_game', onGameStartedEvent);
      socket.off('game_started', onGameStartedEvent);
    };
  }, [currentPlayer.id, onGameStarted]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/?${room.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
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

      {/* Main Lobby Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem' }}>
        {/* Left Column: Player Roster */}
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
                </div>
              );
            })}
          </div>

          {/* Action Zone */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
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
                  }}
                >
                  <Play size={20} />
                  {starting ? 'Starting Game...' : 'Start Game'}
                </button>
                {players.length < 2 && (
                  <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Waiting for at least 1 more player to join before starting...
                  </p>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: '#f1f5f9',
                  padding: '1rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.95rem',
                }}
              >
                <Clock size={18} className="animate-spin" />
                Waiting for the host (<b>{room.hostName}</b>) to start the game...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Room Settings Summary */}
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
    </div>
  );
};
