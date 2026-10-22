import React, { useCallback, useEffect, useState } from 'react';
import {
  ALLOWED_EMOJIS,
  PublicRoomState,
  RoundRevealPayload,
  RoundStartPayload,
} from '../../shared/types';

interface GameViewProps {
  room: PublicRoomState;
  playerId: string;
  roundPayload: RoundStartPayload | null;
  revealPayload: RoundRevealPayload | null;
  serverTimeOffset: number;
  isAudioPlaying: boolean;
  onRetryPlayAudio: () => void;
  onSubmitAnswer: (answer: string) => void;
  onSendEmoji: (emoji: string) => void;
  onLeaveRoom: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  room,
  playerId,
  roundPayload,
  revealPayload,
  serverTimeOffset,
  isAudioPlaying,
  onRetryPlayAudio,
  onSubmitAnswer,
  onSendEmoji,
  onLeaveRoom,
}) => {
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submittedChoice, setSubmittedChoice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const me = room.players.find((p) => p.playerId === playerId);
  const hasAnswered = Boolean(me?.hasAnsweredCurrentRound || submittedChoice !== null);

  useEffect(() => {
    setTypedAnswer('');
    setSubmittedChoice(null);
  }, [roundPayload?.round]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const handleSelectAnswer = useCallback(
    (ans: string) => {
      if (hasAnswered || room.phase !== 'playing') return;
      setSubmittedChoice(ans);
      onSubmitAnswer(ans);
    },
    [hasAnswered, room.phase, onSubmitAnswer]
  );

  // Support pressing keys 1-4 for multiple choice on desktop
  useEffect(() => {
    if (room.phase !== 'playing' || roundPayload?.mode !== 'choice' || hasAnswered) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const choices = roundPayload.choices ?? [];
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (choices[idx]) {
          handleSelectAnswer(choices[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [room.phase, roundPayload, hasAnswered, handleSelectAnswer]);

  const serverNow = now + serverTimeOffset;

  let remainingMs = 0;
  let totalDurationMs = 20000;
  if (room.phase === 'playing' && roundPayload) {
    totalDurationMs = Math.max(
      1000,
      roundPayload.endAtServerTime - roundPayload.startAtServerTime
    );
    remainingMs = Math.max(
      0,
      Math.min(totalDurationMs, roundPayload.endAtServerTime - serverNow)
    );
  } else if (room.phase === 'reveal' && revealPayload) {
    totalDurationMs = 5000;
    remainingMs = Math.max(
      0,
      Math.min(5000, revealPayload.nextRoundAtServerTime - serverNow)
    );
  }

  const progressPct = Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100));
  const remainingSec = (remainingMs / 1000).toFixed(1);

  const myRevealResult = revealPayload?.results.find((r) => r.playerId === playerId);
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-10">
      {/* Top Status & Progress Card */}
      <div className="bg-[#121317] border border-[#22252d] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-400">
              รอบที่{' '}
              <strong className="text-white font-mono">
                {room.currentRound}/{room.totalRounds}
              </strong>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-xs text-zinc-400">
              {room.phase === 'reveal' ? 'เฉลยคำตอบ' : 'กำลังเล่นเพลง'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`font-mono font-bold text-base tabular-nums ${
                room.phase === 'playing' && remainingMs < 5000
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            >
              {remainingSec}s
            </span>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-2.5 py-1 rounded-md bg-[#1a1c23] hover:bg-rose-500/15 hover:text-rose-300 border border-[#2a2d38] text-xs text-zinc-400 transition cursor-pointer"
            >
              ออก
            </button>
          </div>
        </div>

        {/* Crisp Progress Line */}
        <div className="w-full h-1 bg-[#1b1d24]">
          <div
            className={`h-full transition-all duration-100 ${
              room.phase === 'reveal'
                ? 'bg-amber-400'
                : remainingMs < 5000
                ? 'bg-rose-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Main Stage */}
      {room.phase === 'reveal' && revealPayload ? (
        <div className="bg-[#121317] border border-[#22252d] rounded-2xl p-5 space-y-5">
          {/* Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#1e2028]">
            <div>
              {myRevealResult?.correct ? (
                <div className="text-lg font-bold text-emerald-400">
                  ตอบถูกต้อง +{myRevealResult.pointsEarned.toLocaleString()} คะแนน
                </div>
              ) : (
                <div className="text-lg font-bold text-rose-400">
                  {myRevealResult?.submittedAnswer ? 'คำตอบไม่ถูกต้อง' : 'หมดเวลาตอบ'}
                </div>
              )}
              {myRevealResult?.correct && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  <span>
                    ความเร็ว {((myRevealResult.timeMs ?? 0) / 1000).toFixed(2)}s (+
                    {myRevealResult.baseSpeedPoints})
                  </span>
                  {myRevealResult.firstOrderBonus > 0 && (
                    <span className="text-amber-300">
                      • อันดับ #{myRevealResult.correctOrder} (+{myRevealResult.firstOrderBonus})
                    </span>
                  )}
                  {myRevealResult.streakBonus > 0 && (
                    <span className="text-emerald-300">
                      • ชนะต่อเนื่อง {myRevealResult.streak} รอบ (+{myRevealResult.streakBonus})
                    </span>
                  )}
                </div>
              )}
            </div>

            <span className="text-xs font-mono text-zinc-500">
              รอบถัดไปใน {remainingSec}s
            </span>
          </div>

          {/* Revealed Song Metadata */}
          <div className="flex items-center gap-4 bg-[#0a0a0c] p-3.5 rounded-xl border border-[#1e2028]">
            <img
              src={revealPayload.track.cover}
              alt={revealPayload.track.title}
              className="w-20 h-20 rounded-lg object-cover border border-zinc-800 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-[11px] font-medium text-zinc-500">เฉลยเพลง</div>
              <div className="text-lg sm:text-xl font-bold text-white truncate">
                {revealPayload.track.title}
              </div>
              <div className="text-sm text-zinc-400 truncate">
                {revealPayload.track.artist}
              </div>
            </div>
          </div>

          {/* Round Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-500">คะแนนในรอบนี้</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {revealPayload.results.map((r) => (
                <div
                  key={r.playerId}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                    r.correct
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-[#0a0a0c] border-[#1e2028] text-zinc-500'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-zinc-200">{r.nickname}</span>
                    {r.timeMs !== null && (
                      <span className="ml-1.5 font-mono text-[11px] opacity-75">
                        {(r.timeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold shrink-0">
                    {r.correct ? `+${r.pointsEarned}` : '0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#121317] border border-[#22252d] rounded-2xl p-5 space-y-5">
          {/* Studio Waveform Player */}
          <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl bg-[#0a0a0c] border border-[#1e2028] space-y-3">
            <div className="flex items-center justify-center gap-1 h-12">
              {[0.05, 0.2, 0.35, 0.12, 0.28, 0.42, 0.18, 0.38, 0.24, 0.08, 0.32, 0.15, 0.26, 0.1].map(
                (delay, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full bg-emerald-400 ${
                      isAudioPlaying ? 'animate-eq-bar h-10' : 'h-2 opacity-25'
                    }`}
                    style={{ animationDelay: `${delay}s` }}
                  />
                )
              )}
            </div>

            <div className="text-center space-y-1.5">
              <div className="text-xs font-medium text-zinc-400">
                {isAudioPlaying
                  ? room.settings.category === 'tts'
                    ? 'กำลังเล่นเสียง AI (Siri / Google) อ่านเนื้อร้อง...'
                    : 'กำลังเล่นตัวอย่างเพลง 30 วินาที'
                  : 'เสียงถูกระงับโดยเบราว์เซอร์'}
              </div>
              {!isAudioPlaying && (
                <button
                  type="button"
                  onClick={onRetryPlayAudio}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition cursor-pointer"
                >
                  แตะเพื่อเล่นเสียง
                </button>
              )}
            </div>
          </div>

          {/* Answer Controls */}
          {hasAnswered ? (
            <div className="p-5 rounded-xl bg-[#0a0a0c] border border-emerald-500/30 text-center space-y-1">
              <div className="text-sm font-bold text-emerald-400">
                บันทึกคำตอบแล้ว
              </div>
              {submittedChoice && (
                <div className="text-xs text-zinc-300">
                  คำตอบที่เลือก: <span className="font-semibold text-white">{submittedChoice}</span>
                </div>
              )}
              <div className="text-xs text-zinc-500">
                รอผู้เล่นคนอื่นตอบครบ หรือหมดเวลานับถอยหลัง
              </div>
            </div>
          ) : roundPayload?.mode === 'type' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!typedAnswer.trim()) return;
                handleSelectAnswer(typedAnswer.trim());
              }}
              className="space-y-2"
            >
              <label className="block text-xs font-medium text-zinc-400">
                พิมพ์ชื่อเพลง (ภาษาไทย หรือ อังกฤษ)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="ชื่อเพลง..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0a0a0c] border border-[#262932] text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                />
                <button
                  type="submit"
                  disabled={!typedAnswer.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-sm transition cursor-pointer shrink-0"
                >
                  ส่งคำตอบ
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(roundPayload?.choices ?? []).map((choice, idx) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleSelectAnswer(choice)}
                  className="group flex items-center gap-3 p-3.5 rounded-xl bg-[#0a0a0c] hover:bg-[#171920] border border-[#22252d] hover:border-emerald-500/60 text-left transition cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-md bg-[#181a20] group-hover:bg-emerald-500 group-hover:text-black border border-[#2a2d38] text-zinc-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 transition">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-sm text-zinc-100 leading-snug break-words">
                    {choice}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Standings & Reaction Bar */}
      <div className="bg-[#121317] border border-[#22252d] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">คะแนนและสถานะการตอบ</span>
          <div className="flex items-center gap-1">
            {ALLOWED_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => onSendEmoji(em)}
                className="text-base hover:scale-110 active:scale-95 transition px-1 cursor-pointer"
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sortedPlayers.map((p, idx) => (
            <div
              key={p.playerId}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                p.playerId === playerId
                  ? 'bg-[#0a0a0c] border-zinc-700'
                  : 'bg-[#0a0a0c]/60 border-[#1e2028]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-mono text-zinc-500 w-4">
                  {idx + 1}.
                </span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    {p.nickname}
                    {p.streak >= 2 && (
                      <span className="ml-1.5 text-[10px] font-mono text-amber-400">
                        x{p.streak}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    {p.score.toLocaleString()} pts
                  </div>
                </div>
              </div>

              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
                  !p.connected
                    ? 'bg-amber-500/15 text-amber-300'
                    : p.hasAnsweredCurrentRound
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-zinc-800/80 text-zinc-500'
                }`}
              >
                {!p.connected
                  ? 'หลุด'
                  : p.hasAnsweredCurrentRound
                  ? 'ตอบแล้ว'
                  : 'กำลังฟัง'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
