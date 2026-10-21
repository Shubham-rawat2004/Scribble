import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { RoomDTO, PlayerDTO, GameSessionDTO, RemoteDrawStartPayload, RemoteDrawMovePayload, RemoteDrawEndPayload, ChatMessage, PlayerGuessedPayload, ScoreUpdatePayload, TurnEndPayload, RoundScoreItem, GameOverPayload } from '../types/game';
import { useCanvas } from '../hooks/useCanvas';
import { Canvas } from '../components/Canvas';
import { CanvasToolbar } from '../components/CanvasToolbar';
import { SkribblAvatar } from '../components/SkribblAvatar';
import { WordPickerOverlay, WordChoice } from '../components/WordPickerOverlay';
import { WordMaskBar } from '../components/WordMaskBar';
import { ChatBox } from '../components/ChatBox';
import { TurnScoreboardModal } from '../components/TurnScoreboardModal';
import { GameOverModal } from '../components/GameOverModal';
import { StrokeReplayModal } from '../components/StrokeReplayModal';
import { SkribblAlarmClock } from '../components/SkribblAlarmClock';
import { DrawStroke } from '../types/canvas';
import { LogOut, Pencil, Eye, Trophy, CheckCircle2, UserX, UserMinus, Film, ChevronUp, ChevronDown } from 'lucide-react';

interface GameViewProps {
  room: RoomDTO;
  currentPlayer: PlayerDTO;
  session: GameSessionDTO;
  onLeaveRoom: () => void;
  onReturnToLobby?: (room: RoomDTO) => void;
}

export const GameView: React.FC<GameViewProps> = ({
  room,
  currentPlayer,
  session,
  onLeaveRoom,
  onReturnToLobby,
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

  // Chat & Guessing State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guessedPlayerIds, setGuessedPlayerIds] = useState<Set<string>>(new Set());

  // Phase 8 Scoring & Leaderboard State
  const [turnEndSummary, setTurnEndSummary] = useState<{
    secretWord: string;
    roundScores: RoundScoreItem[];
  } | null>(null);
  const [scorePopups, setScorePopups] = useState<Map<string, number>>(new Map());

  // Phase 9 Game Over & Victory Podium State
  const [gameOverData, setGameOverData] = useState<GameOverPayload | null>(null);

  // Stroke Replay State (Medium Priority Feature)
  const [lastTurnReplay, setLastTurnReplay] = useState<{
    secretWord: string;
    drawerName?: string;
    strokes: DrawStroke[];
  } | null>(null);
  const [showReplayModal, setShowReplayModal] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);

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

  const handleSendMessage = (text: string) => {
    socket.emit('send_chat_message', { roomId: room.id, text });
  };

  const handleTriggerReturnToLobby = () => {
    socket.emit('return_to_lobby', { roomId: room.id });
  };

  // Socket listener setup for remote guessers and turn transitions
  useEffect(() => {
    // 1. Initial hydration request for current round's drawing
    socket.emit('request_canvas_state', { roomId: room.id }, (res?: { strokes: any[] }) => {
      if (res && res.strokes) {
        hydrateStrokes(res.strokes);
      }
    });

    // 1b. Fetch active room roster to ensure complete player list
    socket.emit('get_room_players', { roomId: room.id }, (res?: { players: PlayerDTO[] }) => {
      if (res?.players && res.players.length > 0) {
        setPlayers(res.players);
      }
    });

    // 1c. Fetch existing room chat history (including lobby notices)
    socket.emit('get_chat_history', { roomId: room.id }, (res?: { messages: ChatMessage[] }) => {
      if (res?.messages && res.messages.length > 0) {
        setMessages(res.messages);
      }
    });

    // 1d. Fetch last turn replay if available
    socket.emit('get_last_replay', { roomId: room.id }, (res?: { success: boolean; secretWord?: string; drawerName?: string; strokes?: DrawStroke[] }) => {
      if (res?.success && res.strokes && res.strokes.length > 0) {
        setLastTurnReplay({
          secretWord: res.secretWord || '',
          drawerName: res.drawerName || 'Drawer',
          strokes: res.strokes,
        });
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

    const onPlayerLeft = (data: { players: PlayerDTO[]; newHostId?: string }) => {
      setPlayers(data.players);
      if (data.newHostId && data.newHostId === currentPlayer.id) {
        currentPlayer.isHost = true;
      }
    };

    // 3. Word Selection Listeners
    const onWordSelectionStart = (data: { words: WordChoice[]; durationSeconds: number; drawerId?: string }) => {
      if (data.drawerId) {
        setCurrentDrawerId(data.drawerId);
      } else {
        setCurrentDrawerId(currentPlayer.id);
      }
      setWordOptions(data.words);
      setShowWordPicker(true);
      setDrawerChoosingBanner(null);
      setTurnEndedWord(null);
      setTurnEndSummary(null);
      setGuessedPlayerIds(new Set());
      handleClear();
    };

    const onDrawerChoosingWord = (data: { drawerId: string; drawerName: string; durationSeconds: number }) => {
      setCurrentDrawerId(data.drawerId);
      setDrawerChoosingBanner(`${data.drawerName} is choosing a word...`);
      setShowWordPicker(false);
      setTurnEndedWord(null);
      setTurnEndSummary(null);
      setGuessedPlayerIds(new Set());
      handleClear();
    };

    // 4. Turn Started (Word Chosen)
    const onTurnStart = (data: {
      role: 'DRAWER' | 'GUESSER';
      drawerId?: string;
      secretWord?: string;
      wordMask?: string;
      wordLength?: number;
      drawTimeSeconds: number;
      currentRound: number;
      totalRounds: number;
      currentTurn: number;
      totalTurnsInRound: number;
    }) => {
      if (data.drawerId) {
        setCurrentDrawerId(data.drawerId);
      } else if (data.role === 'DRAWER') {
        setCurrentDrawerId(currentPlayer.id);
      }
      setShowWordPicker(false);
      setDrawerChoosingBanner(null);
      setTurnEndedWord(null);
      setTurnEndSummary(null);
      setGuessedPlayerIds(new Set());

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
    const onTurnEnd = (data: TurnEndPayload) => {
      setTurnEndedWord(data.secretWord);
      if (data.scores) {
        setPlayers(data.scores);
      }
      if (data.roundScores && data.roundScores.length > 0) {
        setTurnEndSummary({
          secretWord: data.secretWord,
          roundScores: data.roundScores,
        });
      }
      if (data.strokes && data.strokes.length > 0) {
        setLastTurnReplay({
          secretWord: data.secretWord,
          drawerName: data.drawerName,
          strokes: data.strokes,
        });
      }
    };

    // 8. Real-Time Chat & Guess Verification Listeners
    const onChatMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    const onChatHistory = (data: { roomId: string; messages: ChatMessage[] }) => {
      if (data?.messages) {
        setMessages(data.messages);
      }
    };

    const onPlayerGuessed = (payload: PlayerGuessedPayload) => {
      setGuessedPlayerIds((prev) => new Set(prev).add(payload.playerId));
      if (payload.pointsEarned && payload.newScore !== undefined) {
        setPlayers((prev) =>
          prev.map((p) => (p.id === payload.playerId ? { ...p, score: payload.newScore! } : p))
        );
        setScorePopups((prev) => new Map(prev).set(payload.playerId, payload.pointsEarned!));
        setTimeout(() => {
          setScorePopups((prev) => {
            const next = new Map(prev);
            next.delete(payload.playerId);
            return next;
          });
        }, 2500);
      }
    };

    // 9. Live Scoreboard Update
    const onScoreUpdate = (data: ScoreUpdatePayload) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.playerId ? { ...p, score: data.newScore } : p))
      );
      setScorePopups((prev) => new Map(prev).set(data.playerId, data.pointsEarned));
      setTimeout(() => {
        setScorePopups((prev) => {
          const next = new Map(prev);
          next.delete(data.playerId);
          return next;
        });
      }, 2500);
    };

    // 10. Game Over & Return to Lobby Listeners
    const onGameOver = (data: GameOverPayload) => {
      setGameOverData(data);
      setTurnEndSummary(null);
      setShowWordPicker(false);
      setDrawerChoosingBanner(null);
      setTurnEndedWord(null);
    };

    const onReturnedToLobby = (data: { room: RoomDTO }) => {
      if (onReturnToLobby) {
        onReturnToLobby(data.room);
      }
    };

    const onKicked = (data: { reason?: string }) => {
      alert(data?.reason || 'You were kicked from the room.');
      onLeaveRoom();
    };

    socket.on('draw_start', onDrawStart);
    socket.on('draw_move', onDrawMove);
    socket.on('draw_end', onDrawEnd);
    socket.on('draw_undo', onDrawUndo);
    socket.on('canvas_clear', onCanvasClear);
    socket.on('canvas_init', onCanvasInit);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('kicked', onKicked);

    socket.on('word_selection_start', onWordSelectionStart);
    socket.on('drawer_choosing_word', onDrawerChoosingWord);
    socket.on('turn_start', onTurnStart);
    socket.on('word_hint', onWordHint);
    socket.on('turn_timer_tick', onTurnTimerTick);
    socket.on('turn_end', onTurnEnd);
    socket.on('chat_message', onChatMessage);
    socket.on('chat_history', onChatHistory);
    socket.on('player_guessed_correct', onPlayerGuessed);
    socket.on('score_update', onScoreUpdate);
    socket.on('game_over', onGameOver);
    socket.on('returned_to_lobby', onReturnedToLobby);

    return () => {
      socket.off('draw_start', onDrawStart);
      socket.off('draw_move', onDrawMove);
      socket.off('draw_end', onDrawEnd);
      socket.off('draw_undo', onDrawUndo);
      socket.off('canvas_clear', onCanvasClear);
      socket.off('canvas_init', onCanvasInit);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('kicked', onKicked);

      socket.off('word_selection_start', onWordSelectionStart);
      socket.off('drawer_choosing_word', onDrawerChoosingWord);
      socket.off('turn_start', onTurnStart);
      socket.off('word_hint', onWordHint);
      socket.off('turn_timer_tick', onTurnTimerTick);
      socket.off('turn_end', onTurnEnd);
      socket.off('chat_message', onChatMessage);
      socket.off('chat_history', onChatHistory);
      socket.off('player_guessed_correct', onPlayerGuessed);
      socket.off('score_update', onScoreUpdate);
      socket.off('game_over', onGameOver);
      socket.off('returned_to_lobby', onReturnedToLobby);
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
    onLeaveRoom,
  ]);

  const handleKickPlayer = (targetPlayerId: string, playerName: string) => {
    if (!window.confirm(`Are you sure you want to kick ${playerName}?`)) return;
    socket.emit(
      'kick_player',
      { roomId: room.id, targetPlayerId },
      (res: { success: boolean; error?: string }) => {
        if (!res.success && res.error) {
          alert(res.error);
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
          alert(res.error);
        }
      }
    );
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1380px',
        margin: '0 auto',
        padding: '0.75rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* End-of-Turn Score Summary Modal */}
      {turnEndSummary && !gameOverData && (
        <TurnScoreboardModal
          secretWord={turnEndSummary.secretWord}
          roundScores={turnEndSummary.roundScores}
          durationSeconds={4}
          isRoundEnd={currentTurn >= totalTurnsInRound}
          currentRound={currentRound}
          onOpenReplay={() => setShowReplayModal(true)}
        />
      )}

      {/* Stroke Replay Modal */}
      {showReplayModal && lastTurnReplay && (
        <StrokeReplayModal
          secretWord={lastTurnReplay.secretWord}
          drawerName={lastTurnReplay.drawerName}
          strokes={lastTurnReplay.strokes}
          onClose={() => setShowReplayModal(false)}
        />
      )}

      {/* Match Over Victory Podium Modal */}
      {gameOverData && (
        <GameOverModal
          gameOverData={gameOverData}
          currentPlayer={currentPlayer}
          onReturnToLobby={handleTriggerReturnToLobby}
          onLeave={onLeaveRoom}
        />
      )}

      {/* Top Match Status Header (Matching Skribbl.io Screenshot 1443 & 1444) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '0.6rem 1.25rem',
          borderRadius: '8px',
          border: '3px solid #1e293b',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          minHeight: '62px',
        }}
      >
        {/* Left: Skribbl Alarm Clock + Round Counter (Screenshot 1443 & 1444) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <SkribblAlarmClock timeRemaining={showWordPicker ? 15 : timeRemaining} size={46} />
          <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
            Round {currentRound} of {room.settings.totalRounds}
          </div>
        </div>

        {/* Center: Dynamic Word / Mask Bar or WAITING (Screenshot 1443 & 1444) */}
        <div style={{ textAlign: 'center', flex: 1, padding: '0 1rem' }}>
          <WordMaskBar
            isDrawer={isDrawer}
            secretWord={secretWordForDrawer}
            wordMask={wordMask}
            wordLength={wordLength}
            gameMode={room.settings.gameMode}
            isChoosing={Boolean(showWordPicker || drawerChoosingBanner)}
          />
        </div>

        {/* Right: Replay Button & Leave Game */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {lastTurnReplay && (
            <button
              type="button"
              onClick={() => setShowReplayModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#0284c7',
                backgroundColor: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Watch stroke replay of the previous turn"
            >
              <Film size={15} /> Replay
            </button>
          )}

          <button
            type="button"
            onClick={onLeaveRoom}
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5' }}
          >
            <LogOut size={16} /> Leave
          </button>
        </div>
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

      {/* Main Game Arena Grid: 3-column layout (Roster | Canvas | Chat) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '175px 1fr 300px',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Player Leaderboard / Roster */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '3px solid #1e293b',
            padding: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            height: '580px',
            boxSizing: 'border-box',
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
            {[...players]
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((p, idx) => {
                const isTurnDrawer = p.id === currentDrawerId;
                const isSelf = p.id === currentPlayer.id;
                const isGuessed = guessedPlayerIds.has(p.id);
                const popupPoints = scorePopups.get(p.id);
                const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.6rem',
                      borderRadius: '8px',
                      background: isGuessed ? '#f0fdf4' : isTurnDrawer ? '#fefce8' : isSelf ? '#eff6ff' : '#f8fafc',
                      border: isGuessed ? '2px solid #22c55e' : isTurnDrawer ? '2px solid #eab308' : isSelf ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {/* Rank medal / number */}
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#64748b', width: '20px', textAlign: 'center' }}>
                      {rankBadge}
                    </span>

                    {/* Player Avatar */}
                    <SkribblAvatar avatarId={p.avatarId} size={32} />

                    {/* Player Name and Score */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name} {isSelf && '(You)'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a' }}>
                          {p.score || 0} pts
                        </span>
                        {/* Live Score Increment Popup */}
                        {popupPoints !== undefined && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              color: '#15803d',
                              backgroundColor: '#dcfce7',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              border: '1px solid #86efac',
                            }}
                          >
                            +{popupPoints}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Drawer Pencil or Guessed Checkmark Badge */}
                    {isTurnDrawer && (
                      <span title="Drawing now!" style={{ color: '#eab308', display: 'inline-flex' }}>
                        <Pencil size={15} />
                      </span>
                    )}
                    {isGuessed && (
                      <span title="Guessed the word!" style={{ color: '#16a34a', display: 'inline-flex' }}>
                        <CheckCircle2 size={15} />
                      </span>
                    )}

                    {/* Moderation Controls: Host kick vs Democratic votekick */}
                    {currentPlayer.isHost && !p.isHost && (
                      <button
                        type="button"
                        title={`Kick ${p.name}`}
                        onClick={() => handleKickPlayer(p.id, p.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '0.25rem',
                        }}
                      >
                        <UserX size={15} />
                      </button>
                    )}

                    {!currentPlayer.isHost && !isSelf && (
                      <button
                        type="button"
                        title={`Vote to kick ${p.name}`}
                        onClick={() => handleVoteKick(p.id, p.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ea580c',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '0.25rem',
                        }}
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Center Column: Canvas + In-Canvas Word Picker Overlay + Role Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Canvas Component with In-Canvas Overlays (Exact Skribbl Dimensions) */}
          <div style={{ width: '100%', height: '580px', position: 'relative' }}>
            <Canvas
              canvasRef={canvasRef}
              tool={tool}
              color={color}
              size={size}
              readOnly={!isDrawer}
              pointerHandlers={pointerHandlers}
            >
              {/* Word Selection In-Canvas Overlay (Visible ONLY to active Drawer - Screenshot 1443) */}
              {showWordPicker && isDrawer && (
                <WordPickerOverlay
                  words={wordOptions}
                  durationSeconds={15}
                  onSelectWord={handleSelectWord}
                />
              )}

              {/* Guesser In-Canvas Choosing Word Overlay */}
              {drawerChoosingBanner && !isDrawer && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#2c3545',
                    zIndex: 25,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.85rem',
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.03em', fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif" }}>
                    {drawerChoosingBanner}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8' }}>
                    Waiting for the drawer to pick a word...
                  </div>
                </div>
              )}
            </Canvas>
          </div>

          {/* Controls Area: ONLY VISIBLE TO THE ACTIVE DRAWER! */}
          {isDrawer ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {/* Small collapse toggle arrow matching Screenshot 1444 */}
              <button
                type="button"
                onClick={() => setShowToolbar((prev) => !prev)}
                title={showToolbar ? 'Collapse Toolbar' : 'Expand Toolbar'}
                style={{
                  background: '#ffffff',
                  border: '2px solid #1e293b',
                  borderBottom: 'none',
                  borderRadius: '6px 6px 0 0',
                  padding: '0.1rem 0.85rem',
                  cursor: 'pointer',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '-2px',
                  zIndex: 2,
                }}
              >
                {showToolbar ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>

              {showToolbar && (
                <div style={{ width: '100%', animation: 'fadeIn 0.15s ease' }}>
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
              )}
            </div>
          ) : (
            /* Guesser Card: Controls are restricted during guessing */
            <div
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                border: '2px solid #cbd5e1',
                padding: '0.65rem 1.25rem',
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

        {/* Right Column: Interactive Real-Time Game Chat & Guess Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '580px' }}>
          <ChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isDrawer={isDrawer}
            hasGuessed={guessedPlayerIds.has(currentPlayer.id)}
            isDrawingPhase={!showWordPicker && !drawerChoosingBanner && !turnEndedWord}
          />
        </div>
      </div>
    </div>
  );
};
