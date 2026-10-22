import React, { useState } from 'react';
import {
  CATEGORY_LABELS,
  Category,
  QueueStatusPayload,
} from '../../shared/types';

interface HomeViewProps {
  nickname: string;
  setNickname: (val: string) => void;
  selectedCategory: Category;
  setSelectedCategory: (cat: Category) => void;
  queueStatus: QueueStatusPayload | null;
  serverTimeOffset: number;
  initialJoinCode: string;
  onJoinQueue: () => void;
  onLeaveQueue: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  audioUnlocked: boolean;
  onUnlockAudio: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  nickname,
  setNickname,
  selectedCategory,
  setSelectedCategory,
  queueStatus,
  serverTimeOffset,
  initialJoinCode,
  onJoinQueue,
  onLeaveQueue,
  onCreateRoom,
  onJoinRoom,
  audioUnlocked,
  onUnlockAudio,
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState(initialJoinCode);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    if (!queueStatus?.inQueue || !queueStatus.countdownEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [queueStatus?.inQueue, queueStatus?.countdownEndsAt]);

  const countdownSec =
    queueStatus?.countdownEndsAt
      ? Math.max(
          0,
          Math.ceil((queueStatus.countdownEndsAt - (now + serverTimeOffset)) / 1000)
        )
      : null;

  const categories: Category[] = ['thai', 'tpop', 'tts', 'inter', 'kpop', 'retro', 'mixed'];

  const withAudio = (fn: () => void) => {
    if (!audioUnlocked) onUnlockAudio();
    fn();
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 pt-2 pb-10">
      {/* Clean Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          ทายชื่อเพลงออนไลน์
        </h1>
        <p className="text-zinc-400 text-sm">
          ฟังเพลงหรือเสียง AI อ่านเนื้อร้อง แข่งทายชื่อเพลงกับเพื่อนแบบเรียลไทม์
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-[#121317] border border-[#22252d] rounded-2xl p-5 space-y-5">
        {/* Nickname */}
        <div className="space-y-1.5">
          <label
            htmlFor="nickname-input"
            className="block text-xs font-medium text-zinc-400"
          >
            ชื่อที่ใช้เล่น
          </label>
          <input
            id="nickname-input"
            type="text"
            maxLength={18}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="ตั้งชื่อเล่น..."
            disabled={Boolean(queueStatus?.inQueue)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0c] border border-[#262932] text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-sm font-medium transition"
          />
        </div>

        {/* Category Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-400">
            หมวดเพลง
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => {
              const info = CATEGORY_LABELS[cat];
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  disabled={Boolean(queueStatus?.inQueue)}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-emerald-500/10 border-emerald-500 text-white'
                      : 'bg-[#0a0a0c] border-[#22252d] text-zinc-300 hover:border-zinc-700'
                  } ${cat === 'mixed' ? 'col-span-2' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{info.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        active ? 'bg-emerald-400' : 'bg-transparent'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {info.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Match / Queue Box */}
        {queueStatus?.inQueue ? (
          <div className="p-4 rounded-xl bg-[#0a0a0c] border border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-semibold text-emerald-300">
                  กำลังหาผู้เล่น ({CATEGORY_LABELS[queueStatus.category].name})
                </span>
              </div>
              <span className="font-mono text-xs text-zinc-400">
                {queueStatus.playersCount}/{queueStatus.maxPlayers} คน
              </span>
            </div>

            {countdownSec !== null ? (
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-zinc-300">ครบขั้นต่ำแล้ว เริ่มในอีก</span>
                <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                  {countdownSec}s
                </span>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                รอผู้เล่นครบ 2 คนเพื่อเริ่มนับถอยหลัง 15 วินาที...
              </p>
            )}

            <button
              type="button"
              onClick={onLeaveQueue}
              className="w-full py-2 rounded-lg bg-[#1a1c22] hover:bg-rose-500/20 hover:text-rose-300 border border-[#2a2d37] text-zinc-300 text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิกการเข้าคิว
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => withAudio(onJoinQueue)}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition cursor-pointer"
          >
            เล่นทันที (Quick Match)
          </button>
        )}
      </div>

      {/* Private Room Card */}
      <div className="bg-[#121317] border border-[#22252d] rounded-2xl p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">
            เล่นกับเพื่อน (Private Room)
          </span>
          <button
            type="button"
            disabled={Boolean(queueStatus?.inQueue)}
            onClick={() => withAudio(onCreateRoom)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
          >
            + สร้างห้องใหม่
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!roomCodeInput.trim()) return;
            withAudio(() => onJoinRoom(roomCodeInput.trim().toUpperCase()));
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            maxLength={5}
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="กรอกรหัสห้อง 5 ตัวอักษร"
            disabled={Boolean(queueStatus?.inQueue)}
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-[#0a0a0c] border border-[#262932] font-mono font-bold tracking-widest uppercase text-sm text-white placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={Boolean(queueStatus?.inQueue) || !roomCodeInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#1f222a] hover:bg-[#282c36] disabled:opacity-40 border border-[#2e323d] text-white font-semibold text-sm shrink-0 transition cursor-pointer"
          >
            เข้าห้อง
          </button>
        </form>
      </div>
    </div>
  );
};
