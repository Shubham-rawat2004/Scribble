import React, { useState, useEffect } from 'react';
import { socket } from './services/socket';
import { RoomDTO, PlayerDTO, GameSessionDTO, JoinRoomResponse } from './types/game';
import { Home } from './pages/Home';
import { CreateRoom } from './pages/CreateRoom';
import { JoinRoom } from './pages/JoinRoom';
import { Lobby } from './pages/Lobby';
import { GameView } from './pages/GameView';
import { CanvasSandbox } from './pages/CanvasSandbox';
import { DoodleBackground } from './components/DoodleBackground';

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
  const addLog = (_msg: string, _type: string = 'info') => {};

  useEffect(() => {
    // 1. Check Authentic Skribbl invite format: ?ROOMCODE (e.g. ?SALNXJ) or ?join=ROOMCODE
    let directCode: string | null = null;
    const search = window.location.search;
    if (search && search.length > 1) {
      const rawParam = search.substring(1);
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
    }
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
    if (currentRoom) {
      socket.emit('leave_room', { roomId: currentRoom.id });
    }
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
  const handleQuickPlayOrJoin = (nickname: string, avatarId: string, roomCode?: string) => {
    setSavedNickname(nickname);
    setSavedAvatarId(avatarId);
    const targetCode = roomCode || prefilledRoomCode;

    if (targetCode) {
      addLog(`Joining room ${targetCode} as ${nickname}...`, 'info');
      socket.emit('join_room', { roomId: targetCode, playerName: nickname, avatarId }, (res: JoinRoomResponse) => {
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

  const handleJoinRoomNavigation = (nickname: string, avatarId: string, code: string) => {
    setSavedNickname(nickname);
    setSavedAvatarId(avatarId);
    setPrefilledRoomCode(code);
    handleQuickPlayOrJoin(nickname, avatarId, code);
  };

  return (
    <>
      {/* Background Doodle Canvas */}
      <DoodleBackground />

      <div
        className={activeView === 'active_game' || activeView === 'lobby' ? 'game-arena-wrapper' : 'container'}
        style={{ position: 'relative', zIndex: 2 }}
      >
        {/* VIEW: HOME SCREEN */}
        {activeView === 'home' && (
          <Home
            initialNickname={savedNickname}
            initialAvatarId={savedAvatarId}
            invitedRoomCode={prefilledRoomCode}
            onQuickPlay={handleQuickPlayOrJoin}
            onCreateRoom={handleCreateRoomNavigation}
            onJoinRoom={handleJoinRoomNavigation}
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
      </div>
    </>
  );
};
