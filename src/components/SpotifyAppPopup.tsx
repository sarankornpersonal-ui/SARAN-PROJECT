import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Laptop,
  Loader2,
  LogOut,
  Music,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import type {
  SpokenLanguage,
  SpotifyAuthState,
  SpotifyPlaybackState,
  SpotifySearchTrack,
} from "../types/assistant";
import { SpotifyLiquidGlassIcon } from "./AppGridWorkspace";
import { IosFullScreenApp } from "./IosFullScreenApp";

interface SpotifyAppPopupProps {
  language: SpokenLanguage;
  authState: SpotifyAuthState;
  playback: SpotifyPlaybackState | null;
  authError: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTransferDevice: (deviceId: string) => void;
  onSearchTracks: (query: string) => Promise<SpotifySearchTrack[]>;
  onPlayTrack: (opts: { uri?: string; query?: string }) => Promise<unknown>;
  onSetVolume: (percent: number) => void;
  onClearAuthError: () => void;
  onClose: () => void;
}

const QUICK_MOODS = [
  { label: "Lo-Fi Chill", query: "Chill Lo-Fi Beats" },
  { label: "Jeff Satur", query: "Jeff Satur" },
  { label: "Acoustic", query: "Acoustic Chill" },
  { label: "Deep Focus", query: "Deep Focus Instrumental" },
];

export function SpotifyAppPopup({
  language,
  authState,
  playback,
  authError,
  isConnecting,
  onConnect,
  onDisconnect,
  onTogglePlay,
  onNext,
  onPrevious,
  onTransferDevice,
  onSearchTracks,
  onPlayTrack,
  onSetVolume,
  onClearAuthError,
  onClose,
}: SpotifyAppPopupProps) {
  const prefersReducedMotion = useReducedMotion();
  const isThai = language === "th";

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifySearchTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const activeCallbackUrl =
    authState.callbackUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/spotify/callback`
      : "");

  const handleCopyUri = () => {
    if (!activeCallbackUrl) return;
    navigator.clipboard.writeText(activeCallbackUrl).then(() => {
      setCopiedUri(true);
      window.setTimeout(() => setCopiedUri(false), 2200);
    });
  };

  const runSearch = async (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setIsSearching(true);
    try {
      const tracks = await onSearchTracks(clean);
      setSearchResults(tracks);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(searchQuery);
  };

  const devices = playback?.devices || [];
  const volume = playback?.volumePercent ?? 60;

  return (
    <IosFullScreenApp
      title="Music"
      language={language}
      icon={<SpotifyLiquidGlassIcon size="sm" />}
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* Not Connected State */}
        {!authState.connected && (
          <div className="space-y-4">
            <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <p className="text-base sm:text-lg font-medium text-zinc-900">
                  {isThai
                    ? "เชื่อมต่อบัญชี Spotify ของคุณ"
                    : "Connect your Spotify account"}
                </p>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  {isThai
                    ? "หลังเชื่อมต่อแล้ว คุณสามารถกดค้นหาเพลงในหน้าต่างนี้ หรือสั่งให้ Nolan เปิดเพลงให้ฟังได้ทันทีครับ"
                    : "Once connected, search and play tracks directly here or ask Nolan to play any song by voice."}
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-2.5 p-3.5 rounded-2xl bg-red-50/90 border border-red-200/80 text-xs sm:text-sm text-red-900"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="leading-relaxed">{authError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClearAuthError}
                    aria-label="Dismiss error"
                    className="text-red-500 hover:text-red-800 shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  type="button"
                  disabled={isConnecting}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                  onClick={onConnect}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] rounded-full bg-gradient-to-r from-[#1ED760] to-[#1DB954] text-white font-medium shadow-[0_8px_22px_rgba(29,185,84,0.34),inset_0_1px_1px_rgba(255,255,255,0.5)] hover:brightness-105 disabled:opacity-60 cursor-pointer transition-all"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Music className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span className="text-sm">
                    {isConnecting
                      ? isThai
                        ? "กำลังเปิดหน้าต่าง Spotify..."
                        : "Opening Spotify..."
                      : isThai
                        ? "เชื่อมต่อกับ Spotify"
                        : "Connect with Spotify"}
                  </span>
                </motion.button>

                <button
                  type="button"
                  onClick={() => setShowSetupGuide((prev) => !prev)}
                  className="px-4 py-2.5 min-h-[46px] rounded-full text-xs sm:text-sm font-medium liquid-glass-button text-zinc-700 hover:text-zinc-950 cursor-pointer transition-colors"
                >
                  {isThai ? "ตรวจสอบการตั้งค่า URI" : "Redirect URI Setup"}
                </button>
              </div>
            </div>

            {(!authState.configured || Boolean(authError) || showSetupGuide) && (
              <div className="liquid-glass-card rounded-3xl p-5 space-y-3 text-xs sm:text-sm text-zinc-700">
                <p className="font-medium text-zinc-900">
                  {!authState.configured
                    ? isThai
                      ? "ยังไม่ได้ตั้งค่า SPOTIFY_CLIENT_ID และ SPOTIFY_CLIENT_SECRET ใน AI Studio Secrets"
                      : "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not set in AI Studio Secrets"
                    : isThai
                      ? "หากหน้า Spotify แจ้งว่า Invalid Redirect URI ให้คัดลอกลิงก์นี้ไปใส่ใน Spotify Developer Dashboard:"
                      : "Add this exact Redirect URI in your Spotify Developer Dashboard:"}
                </p>

                {activeCallbackUrl && (
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-white/80 border border-zinc-200/80">
                    <span className="font-mono text-xs text-zinc-800 truncate select-all">
                      {activeCallbackUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUri}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl liquid-glass-button text-xs text-zinc-800 hover:text-blue-700 shrink-0 cursor-pointer"
                    >
                      {copiedUri ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          <span>{isThai ? "คัดลอกแล้ว" : "Copied"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{isThai ? "คัดลอก" : "Copy"}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <p className="text-xs text-zinc-500 leading-relaxed">
                  {isThai
                    ? "หมายเหตุ: หากแอป Spotify ยังอยู่ในโหมด Development ให้เพิ่มอีเมลบัญชี Spotify ของคุณในเมนู User Management บนหน้า Developer Dashboard ด้วยครับ"
                    : "Note: While your Spotify app is in Development Mode, make sure your Spotify account email is added under User Management in the Spotify Developer Dashboard."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connected State */}
        {authState.connected && (
          <div className="space-y-4">
            {/* Account Summary Row */}
            <div className="liquid-glass-card rounded-3xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {authState.avatarUrl ? (
                  <img
                    src={authState.avatarUrl}
                    alt={authState.displayName || "Spotify Profile"}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-white"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-base font-semibold">
                    {(authState.displayName || "S").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-medium text-zinc-900 truncate">
                    {authState.displayName || "Spotify Account"}
                  </p>
                  <p className="text-xs text-zinc-500 capitalize">
                    {authState.product ? `Spotify ${authState.product}` : "Spotify"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onDisconnect}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-full liquid-glass-button text-xs sm:text-sm font-medium text-zinc-700 hover:text-red-600 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isThai ? "ออกจากระบบ" : "Disconnect"}</span>
              </button>
            </div>

            {/* Now Playing Controller */}
            {playback?.track && (
              <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-100 shrink-0 border border-white/80 shadow-sm">
                    {playback.track.albumArtUrl ? (
                      <img
                        src={playback.track.albumArtUrl}
                        alt={playback.track.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <Music className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-zinc-900 truncate">
                      {playback.track.name}
                    </p>
                    <p className="text-xs sm:text-sm text-zinc-500 truncate">
                      {playback.track.artists}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={onPrevious}
                      aria-label={isThai ? "เพลงก่อนหน้า" : "Previous track"}
                      className="w-9 h-9 rounded-full inline-flex items-center justify-center liquid-glass-button text-zinc-700 hover:text-zinc-950 cursor-pointer"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onTogglePlay}
                      aria-label={playback.isPlaying ? "Pause" : "Play"}
                      className="w-11 h-11 rounded-full inline-flex items-center justify-center bg-zinc-900 text-white hover:bg-black cursor-pointer shadow-sm"
                    >
                      {playback.isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onNext}
                      aria-label={isThai ? "เพลงถัดไป" : "Next track"}
                      className="w-9 h-9 rounded-full inline-flex items-center justify-center liquid-glass-button text-zinc-700 hover:text-zinc-950 cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Device Selector + Volume Slider */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200/60">
                  {devices.length > 0 ? (
                    <div className="inline-flex items-center gap-1.5 min-w-0">
                      <Laptop className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />
                      <select
                        aria-label={isThai ? "เลือกอุปกรณ์เล่นเพลง" : "Select playback device"}
                        value={playback.deviceId || devices.find((d) => d.isActive)?.id || ""}
                        onChange={(e) => onTransferDevice(e.target.value)}
                        className="text-xs sm:text-sm text-zinc-700 bg-white/80 border border-white/90 rounded-xl px-2.5 py-1.5 max-w-[200px] truncate cursor-pointer focus:outline-none"
                      >
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      {playback.deviceName || "Spotify"}
                    </span>
                  )}

                  <div className="flex items-center gap-2.5">
                    <Volume2 className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volume}
                      aria-label={isThai ? "ระดับเสียง" : "Volume"}
                      onChange={(e) => onSetVolume(Number(e.target.value))}
                      className="w-28 accent-emerald-500 cursor-pointer"
                    />
                    <span className="font-mono tabular-nums text-xs text-zinc-500 w-9 text-right">
                      {volume}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Search Tracks */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5">
              <div className="relative flex-1 min-w-0">
                <Search
                  className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isThai ? "ค้นหาชื่อเพลงหรือศิลปิน..." : "Search songs or artists..."
                  }
                  className="w-full pl-10 pr-4 py-3 min-h-[46px] text-sm rounded-2xl liquid-glass-input text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <motion.button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                className="px-5 py-3 min-h-[46px] rounded-2xl bg-zinc-900 text-white text-sm font-medium hover:bg-black disabled:opacity-45 cursor-pointer transition-colors shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isThai ? (
                  "ค้นหา"
                ) : (
                  "Search"
                )}
              </motion.button>
            </form>

            {/* Quick Mood / Artist Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_MOODS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(m.query);
                    void runSearch(m.query);
                  }}
                  className="px-3.5 py-1.5 rounded-full liquid-glass-button text-xs sm:text-sm text-zinc-700 hover:text-zinc-950 cursor-pointer transition-colors"
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="liquid-glass-card rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {track.albumArtUrl ? (
                        <img
                          src={track.albumArtUrl}
                          alt={track.name}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                          <Music className="w-4 h-4 text-zinc-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {track.name}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {track.artists}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <motion.button
                        type="button"
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                        onClick={() => void onPlayTrack({ uri: track.uri })}
                        aria-label={`Play ${track.name}`}
                        className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-[#1DB954] text-white hover:brightness-105 cursor-pointer shadow-sm"
                      >
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      </motion.button>
                      {track.externalUrl && (
                        <a
                          href={track.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={isThai ? "เปิดใน Spotify" : "Open in Spotify"}
                          className="w-9 h-9 rounded-full inline-flex items-center justify-center liquid-glass-button text-zinc-600 hover:text-zinc-950"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </IosFullScreenApp>
  );
}
