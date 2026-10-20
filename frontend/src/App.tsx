import React, { useState, useEffect } from 'react';
import { socket, testSocketLatency } from './services/socket';
import { RoomDTO, PlayerDTO, GameSessionDTO } from './types/game';
import { CreateRoom } from './pages/CreateRoom';
import { JoinRoom } from './pages/JoinRoom';
import { Lobby } from './pages/Lobby';
import {
  Activity,
  Database,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  LogIn,
  Sparkles,
  Gamepad2,
} from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  service: string;
  database: string;
}

interface LogItem {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn';
}

type ActiveView = 'home' | 'create_room' | 'join_room' | 'lobby' | 'game_started_preview';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [currentRoom, setCurrentRoom] = useState<RoomDTO | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerDTO | null>(null);
  const [activeSession, setActiveSession] = useState<GameSessionDTO | null>(null);
  const [prefilledRoomCode, setPrefilledRoomCode] = useState<string>('');

  // Health and WebSocket states
  const [socketConnected, setSocketConnected] = useState<boolean>(socket.connected);
  const [socketId, setSocketId] = useState<string>(socket.id || 'Not connected');
  const [latency, setLatency] = useState<number | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { id: Math.random().toString(36).substring(2, 9), time, message, type },
      ...prev.slice(0, 19),
    ]);
  };

  const fetchHealth = async () => {
    setApiLoading(true);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthData = await res.json();
      setHealthData(data);
      addLog(`Health Check OK: DB is ${data.database}`, 'success');
    } catch (err) {
      setHealthData(null);
      addLog(`Health Check Failed: ${(err as Error).message}`, 'warn');
    } finally {
      setApiLoading(false);
    }
  };

  const handleTestLatency = async () => {
    try {
      addLog('Emitting socket ping_test...', 'info');
      const ms = await testSocketLatency();
      setLatency(ms);
      addLog(`Socket Pong received in ${ms}ms`, 'success');
    } catch (err) {
      addLog(`Socket ping failed: ${(err as Error).message}`, 'warn');
    }
  };

  useEffect(() => {
    fetchHealth();

    // Check URL parameters for direct room joining (e.g. ?join=SALNXJ or path /join/:code)
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join') || urlParams.get('room');
    if (joinCode) {
      setPrefilledRoomCode(joinCode.toUpperCase());
      setActiveView('join_room');
    }

    const onConnect = () => {
      setSocketConnected(true);
      setSocketId(socket.id || 'Connected');
      addLog(`Socket.IO Connected (ID: ${socket.id})`, 'success');
      handleTestLatency();
    };

    const onDisconnect = (reason: string) => {
      setSocketConnected(false);
      setSocketId('Disconnected');
      addLog(`Socket.IO Disconnected (${reason})`, 'warn');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const handleRoomCreatedOrJoined = (room: RoomDTO, player: PlayerDTO) => {
    setCurrentRoom(room);
    setCurrentPlayer(player);
    setActiveView('lobby');
    addLog(`Entered lobby for room ${room.id} as ${player.name} (${player.isHost ? 'Host' : 'Guesser'})`, 'success');
  };

  const handleLeaveRoom = () => {
    socket.disconnect();
    socket.connect();
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setActiveView('home');
    addLog('Left room and returned to main menu.', 'info');
  };

  const handleGameStarted = (session: GameSessionDTO) => {
    setActiveSession(session);
    setActiveView('game_started_preview');
    addLog(`Match started! Session ID: ${session.sessionId}`, 'success');
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Skribbl.io Clone</h1>
        <p>Real-Time Multiplayer Drawing & Guessing Architecture</p>
      </header>

      {/* VIEW: CREATE ROOM */}
      {activeView === 'create_room' && (
        <CreateRoom
          onRoomCreated={handleRoomCreatedOrJoined}
          onBack={() => setActiveView('home')}
        />
      )}

      {/* VIEW: JOIN ROOM */}
      {activeView === 'join_room' && (
        <JoinRoom
          initialRoomCode={prefilledRoomCode}
          onRoomJoined={handleRoomCreatedOrJoined}
          onBack={() => setActiveView('home')}
        />
      )}

      {/* VIEW: MULTIPLAYER LOBBY */}
      {activeView === 'lobby' && currentRoom && currentPlayer && (
        <Lobby
          initialRoom={currentRoom}
          currentPlayer={currentPlayer}
          onLeaveRoom={handleLeaveRoom}
          onGameStarted={handleGameStarted}
        />
      )}

      {/* VIEW: GAME STARTED PREVIEW */}
      {activeView === 'game_started_preview' && currentRoom && activeSession && (
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', marginBottom: '1rem' }}>
            <Gamepad2 size={42} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '0.5rem' }}>
            Game Started!
          </h2>
          <p style={{ color: '#475569', fontSize: '1rem', marginBottom: '1.25rem' }}>
            Room <b>{currentRoom.id}</b> is now in active play mode!
          </p>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <div>• <b>Session ID:</b> <code>{activeSession.sessionId}</code></div>
            <div>• <b>Room Status:</b> <span className="badge badge-success">PLAYING</span></div>
            <div>• <b>Total Rounds:</b> {currentRoom.settings.totalRounds}</div>
            <div>• <b>Draw Time:</b> {currentRoom.settings.drawTimeSeconds} seconds per turn</div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <span style={{ fontWeight: 700 }}>✅ Phase 3 Completed:</span> Real-time player rendezvous, live roster synchronization, and host-authoritative game start verified! Ready for <b>Phase 4: Standalone Drawing Canvas</b> and <b>Phase 5: Real-Time Drawing Sync</b>.
          </div>

          <button className="btn btn-primary" onClick={handleLeaveRoom}>
            Return to Main Menu
          </button>
        </div>
      )}

      {/* VIEW: HOME / MAIN DASHBOARD */}
      {activeView === 'home' && (
        <>
          {/* Hero Action Cards */}
          <section
            className="card"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem', color: 'white' }}>
                  Multiplayer Drawing & Guessing
                </h2>
                <p style={{ opacity: 0.9, fontSize: '1rem', maxWidth: '480px' }}>
                  Host a custom game with your friends or enter a room code to join an active lobby.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  onClick={() => setActiveView('create_room')}
                  style={{
                    background: 'white',
                    color: '#1e3a8a',
                    fontWeight: 800,
                    fontSize: '1rem',
                    padding: '0.85rem 1.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <PlusCircle size={18} /> Create Room
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setPrefilledRoomCode('');
                    setActiveView('join_room');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    fontWeight: 800,
                    fontSize: '1rem',
                    padding: '0.85rem 1.5rem',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <LogIn size={18} /> Join Room
                </button>
              </div>
            </div>
          </section>

          {/* Phase 1 System Health Card */}
          <section className="card">
            <h2 className="card-title">
              <Activity size={20} color="#2563eb" />
              Real-Time System Health Status
            </h2>

            <div className="status-grid">
              {/* 1. REST Backend */}
              <div className="status-box">
                <div className="status-info">
                  <span className="status-label">Express REST API</span>
                  <span className="status-value">{healthData ? 'Port 5000 Online' : 'Checking /api/health...'}</span>
                </div>
                {healthData ? (
                  <span className="badge badge-success">
                    <CheckCircle2 size={14} /> OK
                  </span>
                ) : (
                  <span className="badge badge-danger">
                    <XCircle size={14} /> Offline
                  </span>
                )}
              </div>

              {/* 2. Socket.IO WebSocket */}
              <div className="status-box">
                <div className="status-info">
                  <span className="status-label">Socket.IO Real-Time</span>
                  <span className="status-value" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    {socketConnected ? socketId : 'Disconnected'}
                  </span>
                </div>
                {socketConnected ? (
                  <span className="badge badge-success">
                    <Radio size={14} /> Connected
                  </span>
                ) : (
                  <span className="badge badge-danger">
                    <XCircle size={14} /> Offline
                  </span>
                )}
              </div>

              {/* 3. Docker MySQL */}
              <div className="status-box">
                <div className="status-info">
                  <span className="status-label">Docker MySQL 8.0</span>
                  <span className="status-value">
                    {healthData?.database === 'connected' ? 'Port 3307 Ready' : 'Database Offline'}
                  </span>
                </div>
                {healthData?.database === 'connected' ? (
                  <span className="badge badge-success">
                    <Database size={14} /> Ready
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    <XCircle size={14} /> Disconnected
                  </span>
                )}
              </div>

              {/* 4. WebSocket Latency */}
              <div className="status-box">
                <div className="status-info">
                  <span className="status-label">Roundtrip Latency</span>
                  <span className="status-value">{latency !== null ? `${latency} ms` : 'Not tested'}</span>
                </div>
                <span className="badge badge-success">
                  <Clock size={14} /> Real-Time
                </span>
              </div>
            </div>

            <div className="button-group">
              <button className="btn btn-primary" onClick={handleTestLatency} disabled={!socketConnected}>
                <Radio size={16} /> Test Socket Ping
              </button>
              <button className="btn btn-outline" onClick={fetchHealth} disabled={apiLoading}>
                <RefreshCw size={16} className={apiLoading ? 'animate-spin' : ''} /> Refresh Health
              </button>
            </div>
          </section>

          {/* Live Event Log */}
          <section className="card">
            <h2 className="card-title">
              <Radio size={20} color="#0284c7" />
              Live Connection & Event Feed
            </h2>
            <div className="log-box">
              {logs.length === 0 ? (
                <div className="log-entry">
                  <span className="log-time">[Startup]</span>
                  <span>Waiting for server events...</span>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="log-entry">
                    <span className="log-time">[{log.time}]</span>
                    <span style={{ color: log.type === 'success' ? '#4ade80' : log.type === 'warn' ? '#f87171' : '#38bdf8' }}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Architecture Checklist Card */}
          <section className="card" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={18} color="#2563eb" />
              Active System Capabilities
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
              • <b>Phase 1:</b> Containerized MySQL 8.0 on host port 3307, Express REST server, Socket.IO gateway.<br />
              • <b>Phase 2:</b> Host room creation with 6-character room codes and custom match sliders.<br />
              • <b>Phase 3:</b> Joining rooms via code or invite link, real-time multiplayer lobby roster sync (<code>player_joined</code>, <code>player_left</code>), and host-only match initiation (<code>start_game</code>).
            </p>
          </section>
        </>
      )}

      <footer className="footer">
        Skribbl.io Clone Pair-Programming — Built with React, Node.js, Express, Socket.IO, Docker & MySQL.
      </footer>
    </div>
  );
};
