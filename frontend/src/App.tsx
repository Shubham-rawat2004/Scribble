import React, { useState, useEffect } from 'react';
import { socket, testSocketLatency } from './services/socket';
import { RoomDTO, PlayerDTO, GameSessionDTO, JoinRoomResponse } from './types/game';
import { Home } from './pages/Home';
import { CreateRoom } from './pages/CreateRoom';
import { JoinRoom } from './pages/JoinRoom';
import { Lobby } from './pages/Lobby';
import { GameView } from './pages/GameView';
import { CanvasSandbox } from './pages/CanvasSandbox';
import { DoodleBackground } from './components/DoodleBackground';
import { DiagnosticsModal } from './components/DiagnosticsModal';

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

type ActiveView = 'home' | 'create_room' | 'join_room' | 'lobby' | 'active_game' | 'canvas_sandbox';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [currentRoom, setCurrentRoom] = useState<RoomDTO | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerDTO | null>(null);
  const [activeSession, setActiveSession] = useState<GameSessionDTO | null>(null);
  const [prefilledRoomCode, setPrefilledRoomCode] = useState<string>('');

  // Persisted user profile across screens
  const [savedNickname, setSavedNickname] = useState<string>('');
  const [savedAvatarId, setSavedAvatarId] = useState<string>('skribbl_0_0_0');

  // Diagnostics Modal state
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

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
      ...prev.slice(0, 24),
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

    // 1. Check Authentic Skribbl invite format: ?ROOMCODE (e.g. ?SALNXJ) or ?join=ROOMCODE
    let directCode: string | null = null;
    const search = window.location.search;
    if (search && search.length > 1) {
      const rawParam = search.substring(1);
      // If direct code: /?SALNXJ or /?f1CF68YI (6 to 8 alphanumeric chars)
      if (/^[A-Za-z0-9]{6,8}$/.test(rawParam)) {
        directCode = rawParam.toUpperCase();
      } else {
        const urlParams = new URLSearchParams(search);
        directCode = urlParams.get('join') || urlParams.get('room');
        if (directCode) directCode = directCode.toUpperCase();
      }
    }

    // 2. Also check pathname (e.g. /join/SALNXJ or /SALNXJ)
    if (!directCode && window.location.pathname.length > 1) {
      const pathMatch = window.location.pathname.match(/(?:\/join\/|\/)([A-Za-z0-9]{6,8})$/i);
      if (pathMatch) {
        directCode = pathMatch[1].toUpperCase();
      }
    }

    if (directCode) {
      setPrefilledRoomCode(directCode);
      addLog(`Detected room invite URL for room: ${directCode}`, 'info');
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

  const handleRoomCreatedOrJoined = (room: RoomDTO, player: PlayerDTO, session?: GameSessionDTO) => {
    setCurrentRoom(room);
    setCurrentPlayer(player);
    if (room.status === 'PLAYING') {
      const activeSess: GameSessionDTO = session || {
        sessionId: 'active_session',
        roomId: room.id,
        status: 'IN_PROGRESS',
        currentDrawerId: room.currentDrawerId,
        startedAt: new Date().toISOString(),
      };
      setActiveSession(activeSess);
      setActiveView('active_game');
      addLog(`Joined in-progress match in room ${room.id} as ${player.name} (Guesser)!`, 'success');
    } else {
      setActiveView('lobby');
      addLog(`Entered lobby for room ${room.id} as ${player.name} (${player.isHost ? 'Host' : 'Guesser'})`, 'success');
    }
  };

  const handleLeaveRoom = () => {
    socket.disconnect();
    socket.connect();
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setActiveView('home');
    addLog('Left room and returned to main menu.', 'info');
  };

  const handleGameStarted = (session: GameSessionDTO, updatedRoom?: RoomDTO) => {
    if (updatedRoom) {
      setCurrentRoom(updatedRoom);
    }
    setActiveSession(session);
    setActiveView('active_game');
    addLog(`Match started! Active Drawer: ${session.currentDrawerId || 'Host'}`, 'success');
  };

  const handleReturnToLobby = (room: RoomDTO) => {
    setCurrentRoom(room);
    setActiveView('lobby');
    addLog(`Match completed. Returned to room ${room.id} lobby.`, 'info');
  };

  // Direct join from Home "Play!" button
  const handleQuickPlayOrJoin = (nickname: string, avatarId: string, roomCode?: string, isSpectator?: boolean) => {
    setSavedNickname(nickname);
    setSavedAvatarId(avatarId);
    const targetCode = roomCode || prefilledRoomCode;

    if (targetCode) {
      addLog(`Joining room ${targetCode} as ${nickname}${isSpectator ? ' (Spectator)' : ''}...`, 'info');
      socket.emit('join_room', { roomId: targetCode, playerName: nickname, avatarId, isSpectator: Boolean(isSpectator) }, (res: JoinRoomResponse) => {
        if (res.success && res.room && res.player) {
          handleRoomCreatedOrJoined(res.room, res.player, res.session);
        } else {
          addLog(`Failed to join room ${targetCode}: ${res.error}`, 'warn');
          alert(res.error || `Could not join room ${targetCode}. Please verify the code.`);
        }
      });
    } else {
      addLog(`Finding open public game for ${nickname}...`, 'info');
      socket.emit('quick_play', { playerName: nickname, avatarId }, (res: JoinRoomResponse) => {
        if (res.success && res.room && res.player) {
          addLog(`Matched into public room ${res.room.id}!`, 'success');
          handleRoomCreatedOrJoined(res.room, res.player, res.session);
        } else {
          addLog(`Quick play error: ${res.error}`, 'warn');
          setActiveView('join_room');
        }
      });
    }
  };

  const handleCreateRoomNavigation = (nickname: string, avatarId: string) => {
    setSavedNickname(nickname);
    setSavedAvatarId(avatarId);
    setActiveView('create_room');
  };

  const handleJoinRoomNavigation = (nickname: string, avatarId: string, code: string, isSpectator?: boolean) => {
    setSavedNickname(nickname);
    setSavedAvatarId(avatarId);
    setPrefilledRoomCode(code);
    handleQuickPlayOrJoin(nickname, avatarId, code, isSpectator);
  };

  return (
    <>
      {/* Background Doodle Canvas */}
      <DoodleBackground />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        {/* VIEW: HOME SCREEN */}
        {activeView === 'home' && (
          <Home
            initialNickname={savedNickname}
            initialAvatarId={savedAvatarId}
            invitedRoomCode={prefilledRoomCode}
            onQuickPlay={handleQuickPlayOrJoin}
            onCreateRoom={handleCreateRoomNavigation}
            onJoinRoom={handleJoinRoomNavigation}
            onOpenCanvasSandbox={() => setActiveView('canvas_sandbox')}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            isBackendHealthy={healthData?.database === 'connected' && socketConnected}
          />
        )}

        {/* VIEW: PRACTICE DRAWING SANDBOX */}
        {activeView === 'canvas_sandbox' && (
          <CanvasSandbox onBack={() => setActiveView('home')} />
        )}

        {/* VIEW: CREATE ROOM */}
        {activeView === 'create_room' && (
          <CreateRoom
            initialNickname={savedNickname}
            initialAvatarId={savedAvatarId}
            onRoomCreated={handleRoomCreatedOrJoined}
            onBack={() => setActiveView('home')}
          />
        )}

        {/* VIEW: JOIN ROOM */}
        {activeView === 'join_room' && (
          <JoinRoom
            initialRoomCode={prefilledRoomCode}
            initialNickname={savedNickname}
            initialAvatarId={savedAvatarId}
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

        {/* VIEW: ACTIVE GAME VIEW (REAL-TIME DRAWING ARENA) */}
        {activeView === 'active_game' && currentRoom && currentPlayer && activeSession && (
          <GameView
            room={currentRoom}
            currentPlayer={currentPlayer}
            session={activeSession}
            onLeaveRoom={handleLeaveRoom}
            onReturnToLobby={handleReturnToLobby}
          />
        )}

        {/* Global Discreet Diagnostics Pill at the bottom when in Lobby / Sub-pages */}
        {activeView !== 'home' && (
          <div style={{ position: 'fixed', bottom: '1rem', right: '1.5rem', zIndex: 50 }}>
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.9rem',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(6px)',
                borderRadius: '9999px',
                color: '#e2e8f0',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: healthData?.database === 'connected' && socketConnected ? '#22c55e' : '#ef4444',
                }}
              />
              Diagnostics
            </button>
          </div>
        )}
      </div>

      {/* Slide-over / Popup Interview Architecture Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        healthData={healthData}
        socketConnected={socketConnected}
        socketId={socketId}
        latency={latency}
        logs={logs}
        apiLoading={apiLoading}
        onTestLatency={handleTestLatency}
        onRefreshHealth={fetchHealth}
      />
    </>
  );
};
