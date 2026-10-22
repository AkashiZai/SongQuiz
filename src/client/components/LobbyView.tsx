import React, { useState } from 'react';
import {
  ALLOWED_EMOJIS,
  AnswerMode,
  CATEGORY_LABELS,
  Category,
  PublicRoomState,
  RoomSettings,
  TotalRoundsOption,
} from '../../shared/types';

interface LobbyViewProps {
  room: PublicRoomState;
  playerId: string;
  onToggleReady: () => void;
  onUpdateSettings: (partial: Partial<RoomSettings>) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onSendEmoji: (emoji: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  playerId,
  onToggleReady,
  onUpdateSettings,
  onStartGame,
  onLeaveRoom,
  onSendEmoji,
}) => {
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);
  const me = room.players.find((p) => p.playerId === playerId);
  const isHost = Boolean(me?.isHost);

  const shareUrl = `${window.location.origin}/?room=${room.code}`;

  const copyText = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // Ignore clipboard error
    }
  };

  const categories: Category[] = ['thai', 'tpop', 'idol48', 'tts', 'inter', 'kpop', 'retro', 'mixed'];
  const roundOptions: TotalRoundsOption[] = [5, 10, 15];
  const modes: Array<{ id: AnswerMode; label: string; desc: string }> = [
    { id: 'choice', label: '4 ตัวเลือก', desc: 'เลือกคำตอบจากตัวเลือก 4 ข้อ' },
    { id: 'type', label: 'พิมพ์ชื่อเพลง', desc: 'พิมพ์ชื่อเพลงไทยหรืออังกฤษ (รองรับสะกดใกล้เคียง)' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-10">
      {/* Room Header Bar */}
      <div className="bg-[#121317] border border-[#22252d] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-zinc-400">
            {room.isQuickMatch ? 'ห้องจับคู่อัตโนมัติ' : 'รหัสห้องส่วนตัว'}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-white">
              {room.code}
            </span>
            <button
              type="button"
              onClick={() => copyText(room.code, 'code')}
              className="px-2.5 py-1.5 rounded-lg bg-[#1a1c23] hover:bg-[#232630] border border-[#2a2d38] text-xs font-medium text-zinc-200 transition cursor-pointer"
            >
              {copiedType === 'code' ? 'คัดลอกรหัสแล้ว' : 'คัดลอกรหัส'}
            </button>
            <button
              type="button"
              onClick={() => copyText(shareUrl, 'link')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-300 transition cursor-pointer"
            >
              {copiedType === 'link' ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์เชิญ'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onLeaveRoom}
          className="px-3 py-1.5 rounded-lg bg-[#1a1c23] hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30 border border-[#2a2d38] text-zinc-400 text-xs font-medium transition cursor-pointer"
        >
          ออกจากห้อง
        </button>
      </div>

      {room.phase === 'starting' && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
          <span className="text-sm font-semibold text-emerald-300">
            กำลังเริ่มเกม เตรียมฟังเพลงแรก...
          </span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Settings (5 cols) */}
        <div className="md:col-span-5 bg-[#121317] border border-[#22252d] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">ตั้งค่าการเล่น</h2>
            {!isHost && (
              <span className="text-[11px] text-zinc-500">หัวหน้าห้องเป็นผู้ตั้งค่า</span>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">หมวดเพลง</label>
            <div className="space-y-1.5">
              {categories.map((cat) => {
                const info = CATEGORY_LABELS[cat];
                const selected = room.settings.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={!isHost || room.phase === 'starting'}
                    onClick={() => onUpdateSettings({ category: cat })}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left text-xs transition ${
                      selected
                        ? 'bg-emerald-500/10 border-emerald-500 text-white font-semibold'
                        : 'bg-[#0a0a0c] border-[#22252d] text-zinc-400 hover:border-zinc-700'
                    } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span>{info.name}</span>
                    {selected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total Rounds */}
          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">จำนวนรอบ</label>
            <div className="grid grid-cols-3 gap-1.5 bg-[#0a0a0c] p-1 rounded-xl border border-[#22252d]">
              {roundOptions.map((r) => {
                const active = room.settings.totalRounds === r;
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={!isHost || room.phase === 'starting'}
                    onClick={() => onUpdateSettings({ totalRounds: r })}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                      active
                        ? 'bg-[#1f222a] text-white border border-[#323644]'
                        : 'text-zinc-500 hover:text-zinc-300'
                    } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {r} รอบ
                  </button>
                );
              })}
            </div>
          </div>

          {/* Answer Mode */}
          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">รูปแบบการตอบ</label>
            <div className="space-y-1.5">
              {modes.map((m) => {
                const active = room.settings.answerMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!isHost || room.phase === 'starting'}
                    onClick={() => onUpdateSettings({ answerMode: m.id })}
                    className={`w-full p-2.5 rounded-xl border text-left transition ${
                      active
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-[#0a0a0c] border-[#22252d] text-zinc-400'
                    } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="text-xs font-semibold">{m.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Players & Actions (7 cols) */}
        <div className="md:col-span-7 bg-[#121317] border border-[#22252d] rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                ผู้เล่น ({room.players.length})
              </h2>
              <span className="text-xs text-zinc-500">สูงสุด 12 คน</span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {room.players.map((p) => (
                <div
                  key={p.playerId}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0a0a0c] border border-[#1e2028]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.nickname.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white truncate">
                          {p.nickname}
                        </span>
                        {p.playerId === playerId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            คุณ
                          </span>
                        )}
                        {p.isHost && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">
                            HOST
                          </span>
                        )}
                      </div>
                      {!p.connected && (
                        <span className="text-[11px] text-amber-400">
                          ขาดการเชื่อมต่อ (รอ 60 วินาที)
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                      p.isReady
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-zinc-800/80 text-zinc-500'
                    }`}
                  >
                    {p.isReady ? 'พร้อม' : 'รอ'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#1e2028]">
            {/* Reaction Strip */}
            <div className="flex items-center justify-between bg-[#0a0a0c] px-2.5 py-1.5 rounded-xl border border-[#1e2028]">
              <span className="text-[11px] text-zinc-500 pl-1">ส่งอีโมจิ</span>
              <div className="flex items-center gap-1">
                {ALLOWED_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => onSendEmoji(em)}
                    className="text-base hover:scale-110 active:scale-95 transition p-1 cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleReady}
                disabled={room.phase === 'starting'}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1a1c23] hover:bg-[#232630] border border-[#2a2d38] text-zinc-200 font-semibold text-sm transition cursor-pointer"
              >
                {me?.isReady ? 'ยกเลิกพร้อม' : 'กดพร้อม'}
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={onStartGame}
                  disabled={room.phase === 'starting'}
                  className="flex-[1.4] py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition cursor-pointer"
                >
                  เริ่มเกม
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
