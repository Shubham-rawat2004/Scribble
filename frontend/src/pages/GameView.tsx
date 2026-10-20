import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { RoomDTO, PlayerDTO, GameSessionDTO, RemoteDrawStartPayload, RemoteDrawMovePayload, RemoteDrawEndPayload } from '../types/game';
import { useCanvas } from '../hooks/useCanvas';
import { Canvas } from '../components/Canvas';
import { CanvasToolbar } from '../components/CanvasToolbar';
import { SkribblAvatar } from '../components/SkribblAvatar';
import { WordPickerModal, WordChoice } from '../components/WordPickerModal';
import { WordMaskBar } from '../components/WordMaskBar';
import { LogOut, Pencil, Eye, Trophy, Sparkles } from 'lucide-react';

interface GameViewProps {
  room: RoomDTO;
  currentPlayer: PlayerDTO;
  session: GameSessionDTO;
  onLeaveRoom: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  room,
  currentPlayer,
  session,
  onLeaveRoom,
}) => {
  // Active drawer determination (server-authoritative)
  const initialDrawerId = session.currentDrawerId || room.currentDrawerId || room.hostPlayerId;
  const [currentDrawerId, setCurrentDrawerId] = useState<string>(initialDrawerId);
  const [players, setPlayers] = useState<PlayerDTO[]>(room.players);

  // Turn-based State
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [totalTurnsInRound, setTotalTurnsInRound] = useState<number>(room.players.length);

  // Word selection & masking states
  const [wordOptions, setWordOptions] = useState<WordChoice[]>([]);
  const [showWordPicker, setShowWordPicker] = useState<boolean>(false);
  const [drawerChoosingBanner, setDrawerChoosingBanner] = useState<string | null>(null);
  const [secretWordForDrawer, setSecretWordForDrawer] = useState<string>('');
  const [wordMask, setWordMask] = useState<string>('');
  const [wordLength, setWordLength] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(room.settings.drawTimeSeconds || 80);
  const [turnEndedWord, setTurnEndedWord] = useState<string | null>(null);

  // Is current client the designated drawer?
  const isDrawer = currentPlayer.id === currentDrawerId;
  const drawerPlayer = players.find((p) => p.id === currentDrawerId) || players[0];

  // Canvas hook with dual-mode (Drawer emitting vs Guesser listening)
  const {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    canUndo,
    handleUndo,
    handleClear,
    pointerHandlers,
    applyRemoteStrokeStart,
    applyRemoteStrokeMove,
    applyRemoteStrokeEnd,
    applyRemoteUndo,
    applyRemoteClear,
    hydrateStrokes,
    totalPoints,
    strokes,
  } = useCanvas({
    readOnly: !isDrawer,
    initialTool: 'brush',
    initialColor: '#000000',
    initialSize: 10,
    // When Drawer draws, emit network packets to room channel
    onEmitStrokeStart: (stroke) => {
      socket.emit('draw_start', { roomId: room.id, stroke });
    },
    onEmitStrokeMove: (strokeId, points) => {
      socket.emit('draw_move', { roomId: room.id, strokeId, points });
    },
    onEmitStrokeEnd: (strokeId) => {
      socket.emit('draw_end', { roomId: room.id, strokeId });
    },
    onEmitUndo: () => {
      socket.emit('draw_undo', { roomId: room.id });
    },
    onEmitClear: () => {
      socket.emit('canvas_clear', { roomId: room.id });
    },
  });

  const handleSelectWord = (word: string) => {
    socket.emit('select_word', { roomId: room.id, word });
    setShowWordPicker(false);
  };

  // Socket listener setup for remote spectators and turn transitions
  useEffect(() => {
    // 1. Initial hydration request for current round's drawing
    socket.emit('request_canvas_state', { roomId: room.id }, (res?: { strokes: any[] }) => {
      if (res && res.strokes) {
        hydrateStrokes(res.strokes);
      }
    });

    // 2. Real-time drawing broadcasts
    const onDrawStart = (data: RemoteDrawStartPayload) => {
      applyRemoteStrokeStart(data.stroke);
    };

    const onDrawMove = (data: RemoteDrawMovePayload) => {
      applyRemoteStrokeMove(data.strokeId, data.points);
    };

    const onDrawEnd = (data: RemoteDrawEndPayload) => {
      applyRemoteStrokeEnd(data.strokeId);
    };

    const onDrawUndo = () => {
      applyRemoteUndo();
    };

    const onCanvasClear = () => {
      applyRemoteClear();
    };

    const onCanvasInit = (data: { roomId: string; strokes: any[] }) => {
      if (data.strokes) {
        hydrateStrokes(data.strokes);
      }
    };

    // Update roster if players join/leave during match
    const onPlayerJoined = (data: { players: PlayerDTO[] }) => {
      setPlayers(data.players);
    };

    const onPlayerLeft = (data: { players: PlayerDTO[] }) => {
      setPlayers(data.players);
    };

    // 3. Word Selection Listeners
    const onWordSelectionStart = (data: { words: WordChoice[]; durationSeconds: number }) => {
      setWordOptions(data.words);
      setShowWordPicker(true);
      setDrawerChoosingBanner(null);
      setTurnEndedWord(null);
      handleClear();
    };

    const onDrawerChoosingWord = (data: { drawerId: string; drawerName: string; durationSeconds: number }) => {
      setCurrentDrawerId(data.drawerId);
      setDrawerChoosingBanner(`${data.drawerName} is choosing a word...`);
      setShowWordPicker(false);
      setTurnEndedWord(null);
      handleClear();
    };

    // 4. Turn Started (Word Chosen)
    const onTurnStart = (data: {
      role: 'DRAWER' | 'GUESSER';
      secretWord?: string;
      wordMask?: string;
      wordLength?: number;
      drawTimeSeconds: number;
      currentRound: number;
      totalRounds: number;
      currentTurn: number;
      totalTurnsInRound: number;
    }) => {
      setShowWordPicker(false);
      setDrawerChoosingBanner(null);
      setTurnEndedWord(null);

      setCurrentRound(data.currentRound);
      setCurrentTurn(data.currentTurn);
      setTotalTurnsInRound(data.totalTurnsInRound);
      setTimeRemaining(data.drawTimeSeconds);

      if (data.role === 'DRAWER' && data.secretWord) {
        setSecretWordForDrawer(data.secretWord);
      } else if (data.role === 'GUESSER' && data.wordMask) {
        setWordMask(data.wordMask);
        setWordLength(data.wordLength || 0);
      }
    };

    // 5. Progressive Hint Revealed
    const onWordHint = (data: { wordMask: string }) => {
      setWordMask(data.wordMask);
    };

    // 6. Turn Countdown Tick
    const onTurnTimerTick = (data: { timeRemainingSeconds: number }) => {
      setTimeRemaining(data.timeRemainingSeconds);
    };

    // 7. Turn Ended (Time expired or all guessed)
    const onTurnEnd = (data: { secretWord: string; reason: string }) => {
      setTurnEndedWord(data.secretWord);
    };

    socket.on('draw_start', onDrawStart);
    socket.on('draw_move', onDrawMove);
    socket.on('draw_end', onDrawEnd);
    socket.on('draw_undo', onDrawUndo);
    socket.on('canvas_clear', onCanvasClear);
    socket.on('canvas_init', onCanvasInit);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);

    socket.on('word_selection_start', onWordSelectionStart);
    socket.on('drawer_choosing_word', onDrawerChoosingWord);
    socket.on('turn_start', onTurnStart);
    socket.on('word_hint', onWordHint);
    socket.on('turn_timer_tick', onTurnTimerTick);
    socket.on('turn_end', onTurnEnd);

    return () => {
      socket.off('draw_start', onDrawStart);
      socket.off('draw_move', onDrawMove);
      socket.off('draw_end', onDrawEnd);
      socket.off('draw_undo', onDrawUndo);
      socket.off('canvas_clear', onCanvasClear);
      socket.off('canvas_init', onCanvasInit);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);

      socket.off('word_selection_start', onWordSelectionStart);
      socket.off('drawer_choosing_word', onDrawerChoosingWord);
      socket.off('turn_start', onTurnStart);
      socket.off('word_hint', onWordHint);
      socket.off('turn_timer_tick', onTurnTimerTick);
      socket.off('turn_end', onTurnEnd);
    };
  }, [
    room.id,
    applyRemoteStrokeStart,
    applyRemoteStrokeMove,
    applyRemoteStrokeEnd,
    applyRemoteUndo,
    applyRemoteClear,
    hydrateStrokes,
    handleClear,
  ]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Drawer Word Selection Modal (Only shown to active drawer) */}
      {showWordPicker && isDrawer && (
        <WordPickerModal
          words={wordOptions}
          durationSeconds={15}
          onSelectWord={handleSelectWord}
        />
      )}

      {/* Top Match Status Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#ffffff',
          padding: '0.85rem 1.25rem',
          borderRadius: '16px',
          border: '2px solid #1e293b',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Left: Room & Round Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Room {room.id}
            </span>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e3a8a' }}>
              Round {currentRound} of {room.settings.totalRounds} (Turn {currentTurn}/{totalTurnsInRound})
            </div>
          </div>
        </div>

        {/* Center: Dynamic Word / Mask Bar or Waiting State */}
        <div style={{ textAlign: 'center' }}>
          {drawerChoosingBanner ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 1.25rem',
                borderRadius: '9999px',
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                color: '#b45309',
                fontWeight: 800,
                fontSize: '0.95rem',
              }}
            >
              <Sparkles size={18} /> {drawerChoosingBanner}
            </div>
          ) : (
            <WordMaskBar
              isDrawer={isDrawer}
              secretWord={secretWordForDrawer}
              wordMask={wordMask}
              wordLength={wordLength}
              timeRemaining={timeRemaining}
            />
          )}
        </div>

        {/* Right: Leave Game */}
        <button
          type="button"
          onClick={onLeaveRoom}
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5' }}
        >
          <LogOut size={16} /> Leave
        </button>
      </div>

      {/* Turn Ended Alert (Displays revealed word before advancing) */}
      {turnEndedWord && (
        <div
          style={{
            background: '#ecfdf5',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            textAlign: 'center',
            fontSize: '1rem',
            color: '#065f46',
            fontWeight: 800,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          Turn Ended! The word was: <b style={{ textTransform: 'uppercase', color: '#047857', letterSpacing: '0.08em' }}>{turnEndedWord}</b>. Getting next drawer ready...
        </div>
      )}

      {/* Main Game Arena Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Player Leaderboard / Roster */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px solid #1e293b',
            padding: '1rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Trophy size={16} color="#eab308" /> Players
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
              {players.length} Online
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '520px', overflowY: 'auto' }}>
            {players.map((p, idx) => {
              const isTurnDrawer = p.id === currentDrawerId;
              const isSelf = p.id === currentPlayer.id;

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '10px',
                    background: isTurnDrawer ? '#fefce8' : isSelf ? '#eff6ff' : '#f8fafc',
                    border: isTurnDrawer ? '2px solid #eab308' : isSelf ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                  }}
                >
                  {/* Rank number */}
                  <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#64748b', width: '16px' }}>
                    #{idx + 1}
                  </span>

                  {/* Player Avatar */}
                  <SkribblAvatar avatarId={p.avatarId} size={34} />

                  {/* Player Name and Score */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name} {isSelf && '(You)'}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' }}>
                      {p.score || 0} pts
                    </div>
                  </div>

                  {/* Drawer Pencil Badge */}
                  {isTurnDrawer && (
                    <span title="Drawing now!" style={{ color: '#eab308', display: 'inline-flex' }}>
                      <Pencil size={16} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Canvas + Role-Restricted Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Canvas Component */}
          <div style={{ width: '100%', height: '500px', position: 'relative' }}>
            <Canvas
              canvasRef={canvasRef}
              tool={tool}
              color={color}
              size={size}
              readOnly={!isDrawer}
              pointerHandlers={pointerHandlers}
            />
          </div>

          {/* Controls Area: ONLY VISIBLE TO THE ACTIVE DRAWER! */}
          {isDrawer ? (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <CanvasToolbar
                tool={tool}
                color={color}
                size={size}
                canUndo={canUndo}
                onSelectTool={setTool}
                onSelectColor={setColor}
                onSelectSize={setSize}
                onUndo={handleUndo}
                onClear={handleClear}
              />
            </div>
          ) : (
            /* Guesser Spectator Card: Controls are completely restricted */
            <div
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '2px solid #cbd5e1',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#475569',
                fontSize: '0.88rem',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} color="#2563eb" />
                <span>
                  You are a <b>Guesser</b> this turn. Watching <b>{drawerPlayer?.name || 'Drawer'}</b> draw in real time.
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                🔒 Drawing Controls Restricted
              </span>
            </div>
          )}

          {/* Real-Time Networking Telemetry Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.4rem 0.75rem',
              background: 'rgba(15, 23, 42, 0.75)',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '0.75rem',
            }}
          >
            <span>⚡ Match Sync: <b>Turn Active</b> ({strokes.length} strokes, {totalPoints} points)</span>
            <span>Channel: <code>room_{room.id}</code></span>
            {/* Solo Testing Helper: Switch Role preview */}
            <button
              type="button"
              onClick={() => {
                const otherPlayer = players.find((p) => p.id !== currentDrawerId);
                if (otherPlayer) {
                  setCurrentDrawerId(otherPlayer.id);
                } else {
                  setCurrentDrawerId((prev) => (prev === currentPlayer.id ? 'test_guesser_id' : currentPlayer.id));
                }
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#38bdf8',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              🔄 Toggle Role (Demo Drawer / Guesser View)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
