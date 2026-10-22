import React from 'react';
import {
  ALLOWED_EMOJIS,
  FinalPlayerSummary,
  GameOverPayload,
  PublicRoomState,
} from '../../shared/types';

interface ResultViewProps {
  room: PublicRoomState;
  gameOver: GameOverPayload | null;
  playerId: string;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
  onSendEmoji: (emoji: string) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  room,
  gameOver,
  playerId,
  onPlayAgain,
  onLeaveRoom,
  onSendEmoji,
}) => {
  const standings: FinalPlayerSummary[] =
    gameOver?.standings ??
    [...room.players]
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({
        rank: idx + 1,
        playerId: p.playerId,
        nickname: p.nickname,
        avatarColor: p.avatarColor,
        score: p.score,
        correctCount: p.correctCount,
        totalRounds: room.totalRounds,
        fastestTimeMs: p.fastestTimeMs,
        maxStreak: p.maxStreak,
      }));

  const winner = standings[0];

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pb-10">
      {/* Winner Summary Header */}
      <div className="bg-[#121317] border border-[#22252d] rounded-2xl p-6 text-center space-y-2">
        <div className="text-xs font-medium text-zinc-400">
          จบการแข่งขัน • ห้อง {room.code}
        </div>
        {winner && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              อันดับ 1: {winner.nickname}
            </h1>
            <div className="inline-flex items-center gap-3 px-3.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-sm font-semibold">
              <span>{winner.score.toLocaleString()} คะแนน</span>
              <span className="text-zinc-500">|</span>
              <span className="font-sans">
                ตอบถูก {winner.correctCount}/{winner.totalRounds} ข้อ
              </span>
            </div>
          </>
        )}
      </div>

      {/* Standings Table */}
      <div className="bg-[#121317] border border-[#22252d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">ตารางสรุปผลคะแนน</h2>
          <span className="text-xs text-zinc-500">{standings.length} ผู้เล่น</span>
        </div>

        <div className="space-y-2">
          {standings.map((s) => {
            const isMe = s.playerId === playerId;
            return (
              <div
                key={s.playerId}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
                  isMe
                    ? 'bg-[#0a0a0c] border-emerald-500/50'
                    : 'bg-[#0a0a0c] border-[#1e2028]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 text-center font-mono font-bold text-sm ${
                      s.rank === 1
                        ? 'text-amber-400'
                        : s.rank === 2
                        ? 'text-zinc-300'
                        : s.rank === 3
                        ? 'text-amber-600'
                        : 'text-zinc-500'
                    }`}
                  >
                    #{s.rank}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                    style={{ backgroundColor: s.avatarColor }}
                  >
                    {s.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-white truncate">
                        {s.nickname}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          คุณ
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-zinc-400 mt-0.5">
                      <span>
                        ถูก {s.correctCount}/{s.totalRounds}
                      </span>
                      <span>•</span>
                      <span>
                        เร็วสุด{' '}
                        <strong className="font-mono text-zinc-200">
                          {s.fastestTimeMs !== null
                            ? `${(s.fastestTimeMs / 1000).toFixed(2)}s`
                            : '-'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        ต่อเนื่องสูงสุด <strong className="font-mono text-zinc-200">{s.maxStreak}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
                    {s.score.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-500">คะแนน</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reaction Bar */}
        <div className="flex items-center justify-between bg-[#0a0a0c] px-3 py-2 rounded-xl border border-[#1e2028]">
          <span className="text-xs text-zinc-500">ส่งอีโมจิ</span>
          <div className="flex items-center gap-1">
            {ALLOWED_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => onSendEmoji(em)}
                className="text-lg hover:scale-110 active:scale-95 transition px-1 cursor-pointer"
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition cursor-pointer"
          >
            เล่นอีกครั้งในห้องเดิม
          </button>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="py-3 px-5 rounded-xl bg-[#1a1c23] hover:bg-[#232630] border border-[#2a2d38] text-zinc-300 font-semibold text-sm transition cursor-pointer"
          >
            กลับหน้าแรก
          </button>
        </div>
      </div>
    </div>
  );
};
