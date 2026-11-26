import { useCallback, useEffect, useRef, useState } from "react";
import type { SpotifyAuthState, SpotifyPlaybackState } from "../types/assistant";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
  }
}

interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (...args: any[]) => void) => void;
  removeListener: (event: string, cb: (...args: any[]) => void) => void;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
}

const STORAGE_KEY = "nolan_spotify_session_id";

export function useSpotify() {
  const [authState, setAuthState] = useState<SpotifyAuthState>({
    configured: false,
    connected: false,
  });
  const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null);
  const [playerNotice, setPlayerNotice] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [spotifySessionId, setSpotifySessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    }
    return null;
  });

  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(spotifySessionId);
  const popupWatcherRef = useRef<number | null>(null);

  useEffect(() => {
    if (spotifySessionId) {
      sessionIdRef.current = spotifySessionId;
    }
  }, [spotifySessionId]);

  const clearPopupWatcher = useCallback(() => {
    if (popupWatcherRef.current !== null) {
      window.clearInterval(popupWatcherRef.current);
      popupWatcherRef.current = null;
    }
  }, []);

  const getSpotifyHeaders = useCallback((includeJsonContentType = false): HeadersInit => {
    const headers: Record<string, string> = {
      "X-Requested-With": "XMLHttpRequest",
    };
    if (includeJsonContentType) {
      headers["Content-Type"] = "application/json";
    }
    const activeSessionId =
      sessionIdRef.current ||
      (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
    if (activeSessionId) {
      headers["x-spotify-session"] = activeSessionId;
    }
    return headers;
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const originParam = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/spotify/status?origin=${originParam}`, {
        headers: getSpotifyHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        setAuthState({
          configured: Boolean(data.configured),
          connected: Boolean(data.connected),
          displayName: data.displayName,
          product: data.product,
          avatarUrl: data.avatarUrl,
          callbackUrl: data.callbackUrl,
        });
        if (data.sessionId && typeof data.sessionId === "string") {
          sessionIdRef.current = data.sessionId;
          setSpotifySessionId(data.sessionId);
          try {
            localStorage.setItem(STORAGE_KEY, data.sessionId);
          } catch {
            // ignore
          }
        }
        if (data.playback) {
          setPlayback(data.playback);
        }
      }
    } catch (err) {
      console.error("Failed to fetch Spotify status:", err);
    }
  }, [getSpotifyHeaders]);

  // Initialize status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    return () => clearPopupWatcher();
  }, [clearPopupWatcher]);

  // Listen for OAuth popup completion or error with strict origin check
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      try {
        const origin = event.origin || "";
        const isTrustedOrigin =
          origin === window.location.origin ||
          origin.endsWith(".run.app") ||
          origin.includes("localhost");
        if (!isTrustedOrigin) {
          return;
        }
      } catch {
        return;
      }

      if (event.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        clearPopupWatcher();
        setAuthError(null);
        if (typeof event.data.sessionId === "string" && event.data.sessionId.trim()) {
          const cleanSessionId = event.data.sessionId.trim();
          sessionIdRef.current = cleanSessionId;
          setSpotifySessionId(cleanSessionId);
          try {
            localStorage.setItem(STORAGE_KEY, cleanSessionId);
          } catch {
            // ignore
          }
        }
        setIsConnecting(false);
        void fetchStatus();
        setPlayerNotice("Connected to Spotify!");
        setTimeout(() => setPlayerNotice(null), 3500);
      } else if (event.data?.type === "SPOTIFY_AUTH_ERROR") {
        clearPopupWatcher();
        setIsConnecting(false);
        const msg =
          typeof event.data.error === "string" && event.data.error.trim()
            ? event.data.error.trim()
            : "Failed to authorize Spotify.";
        setAuthError(msg);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [clearPopupWatcher, fetchStatus]);

  // Initialize Spotify Web Playback SDK when connected
  useEffect(() => {
    if (!authState.connected) {
      if (playerRef.current) {
        try {
          playerRef.current.disconnect();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
      return;
    }

    const initPlayer = () => {
      try {
        if (!window.Spotify || playerRef.current) return;

        const player = new window.Spotify.Player({
          name: "Nolan Voice Player",
          getOAuthToken: async (cb) => {
            try {
              const res = await fetch("/api/spotify/token", {
                headers: getSpotifyHeaders(),
              });
              if (res.ok) {
                const data = await res.json();
                cb(data.accessToken);
              }
            } catch (err) {
              console.error("Failed to fetch Spotify token for SDK:", err);
            }
          },
          volume: 0.5,
        });

        player.addListener("ready", ({ device_id }) => {
          deviceIdRef.current = device_id;
          setIsSdkReady(true);
          fetch("/api/spotify/device", {
            method: "POST",
            headers: getSpotifyHeaders(true),
            body: JSON.stringify({ deviceId: device_id }),
          }).catch(() => {});
        });

        player.addListener("not_ready", () => {
          setIsSdkReady(false);
        });

        player.addListener("player_state_changed", (state) => {
          try {
            if (!state) return;
            const current = state.track_window?.current_track;
            if (current) {
              setPlayback((prev) => ({
                isPlaying: !state.paused,
                progressMs: state.position,
                durationMs: state.duration,
                deviceName: "Nolan Voice Player",
                deviceId: deviceIdRef.current || undefined,
                devices: prev?.devices,
                volumePercent: prev?.volumePercent,
                track: {
                  id: current.id,
                  name: current.name,
                  artists: current.artists?.map((a: any) => a.name).join(", ") || "",
                  album: current.album?.name || "",
                  albumArtUrl: current.album?.images?.[0]?.url,
                  durationMs: state.duration,
                },
              }));
            }
          } catch {
            // ignore
          }
        });

        player.connect().catch((err) => {
          console.warn("Spotify Web Playback SDK connection note:", err);
        });

        playerRef.current = player;
      } catch (err) {
        console.warn("Spotify Player init error:", err);
      }
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
      if (!document.getElementById("spotify-player-sdk")) {
        const script = document.createElement("script");
        script.id = "spotify-player-sdk";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.body.appendChild(script);
      }
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.disconnect();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [authState.connected, getSpotifyHeaders]);

  const connectSpotify = useCallback(async () => {
    setIsConnecting(true);
    setAuthError(null);
    clearPopupWatcher();
    try {
      const originParam = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/auth/spotify/url?origin=${originParam}`);
      const data = await res.json();
      if (data.callbackUrl) {
        setAuthState((prev) => ({
          ...prev,
          configured: Boolean(data.configured),
          callbackUrl: data.callbackUrl,
        }));
      }
      if (data.url) {
        const popup = window.open(
          data.url,
          "spotify_oauth",
          "width=560,height=720,left=200,top=90"
        );
        if (!popup) {
          const msg =
            "เบราว์เซอร์บล็อกหน้าต่างป๊อปอัพ กรุณาอนุญาตป๊อปอัพสำหรับเว็บไซต์นี้แล้วลองเชื่อมต่ออีกครั้งครับ";
          setAuthError(msg);
          setPlayerNotice(msg);
          setTimeout(() => setPlayerNotice(null), 5000);
          setIsConnecting(false);
          return;
        }
        popupWatcherRef.current = window.setInterval(() => {
          try {
            if (popup.closed) {
              clearPopupWatcher();
              setIsConnecting(false);
            }
          } catch {
            // cross-origin window check may ignore
          }
        }, 450);
      } else {
        const msg =
          data.error ||
          "Spotify application credentials (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET) are missing.";
        setAuthError(msg);
        setPlayerNotice(msg);
        setTimeout(() => setPlayerNotice(null), 5000);
        setIsConnecting(false);
      }
    } catch (err) {
      console.error("Connect Spotify error:", err);
      setAuthError("Unable to reach Spotify authentication server.");
      setIsConnecting(false);
    }
  }, [clearPopupWatcher]);

  const disconnectSpotify = useCallback(async () => {
    try {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      await fetch("/api/auth/spotify/logout", {
        method: "POST",
        headers: getSpotifyHeaders(),
      });
      sessionIdRef.current = null;
      deviceIdRef.current = null;
      setSpotifySessionId(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setIsSdkReady(false);
      setAuthState((prev) => ({ ...prev, connected: false }));
      setPlayback(null);
      setPlayerNotice("Disconnected from Spotify.");
      setTimeout(() => setPlayerNotice(null), 3000);
    } catch (err) {
      console.error("Disconnect Spotify error:", err);
    }
  }, [getSpotifyHeaders]);

  const togglePlayPause = useCallback(async () => {
    if (!playback) return;
    const action = playback.isPlaying ? "pause" : "resume";
    try {
      const res = await fetch("/api/spotify/control", {
        method: "POST",
        headers: getSpotifyHeaders(true),
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.playback) {
        setPlayback(data.playback);
      } else {
        setPlayback((prev) => (prev ? { ...prev, isPlaying: !prev.isPlaying } : null));
      }
    } catch {
      // ignore
    }
  }, [getSpotifyHeaders, playback]);

  const nextTrack = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/control", {
        method: "POST",
        headers: getSpotifyHeaders(true),
        body: JSON.stringify({ action: "next" }),
      });
      const data = await res.json();
      if (data.playback) {
        setPlayback(data.playback);
      }
    } catch {
      // ignore
    }
  }, [getSpotifyHeaders]);

  const previousTrack = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/control", {
        method: "POST",
        headers: getSpotifyHeaders(true),
        body: JSON.stringify({ action: "previous" }),
      });
      const data = await res.json();
      if (data.playback) {
        setPlayback(data.playback);
      }
    } catch {
      // ignore
    }
  }, [getSpotifyHeaders]);

  const transferDevice = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return;
      try {
        const res = await fetch("/api/spotify/control", {
          method: "POST",
          headers: getSpotifyHeaders(true),
          body: JSON.stringify({ action: "transfer", deviceId }),
        });
        const data = await res.json();
        if (data.playback) {
          setPlayback(data.playback);
        }
        if (data.message) {
          setPlayerNotice(data.message);
          setTimeout(() => setPlayerNotice(null), 3500);
        }
      } catch {
        // ignore
      }
    },
    [getSpotifyHeaders]
  );

  const searchTracks = useCallback(
    async (query: string) => {
      if (!query.trim()) return [];
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(query.trim())}`,
          { headers: getSpotifyHeaders() }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.tracks) ? data.tracks : [];
      } catch {
        return [];
      }
    },
    [getSpotifyHeaders]
  );

  const playTrack = useCallback(
    async (opts: { uri?: string; query?: string }) => {
      try {
        const res = await fetch("/api/spotify/control", {
          method: "POST",
          headers: getSpotifyHeaders(true),
          body: JSON.stringify({ action: "play", ...opts }),
        });
        const data = await res.json();
        if (data.playback) {
          setPlayback(data.playback);
        }
        if (data.message && !data.success) {
          setPlayerNotice(data.message);
          setTimeout(() => setPlayerNotice(null), 4500);
        }
        return data;
      } catch {
        return { success: false };
      }
    },
    [getSpotifyHeaders]
  );

  const setVolume = useCallback(
    async (volumePercent: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
      setPlayback((prev) => (prev ? { ...prev, volumePercent: clamped } : prev));
      try {
        await fetch("/api/spotify/control", {
          method: "POST",
          headers: getSpotifyHeaders(true),
          body: JSON.stringify({ action: "volume", volumePercent: clamped }),
        });
      } catch {
        // ignore
      }
    },
    [getSpotifyHeaders]
  );

  const handleSpotifyStateFromWs = useCallback(
    (newPlayback?: SpotifyPlaybackState | null, notice?: string, _premiumRequired?: boolean) => {
      if (newPlayback) {
        setPlayback(newPlayback);
      }
      if (notice) {
        setPlayerNotice(notice);
        setTimeout(() => setPlayerNotice(null), 5000);
      }
    },
    []
  );

  const dismissNowPlaying = useCallback(() => {
    setPlayback(null);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return {
    authState,
    playback,
    playerNotice,
    authError,
    isSdkReady,
    isConnecting,
    spotifySessionId,
    connectSpotify,
    disconnectSpotify,
    togglePlayPause,
    nextTrack,
    previousTrack,
    transferDevice,
    searchTracks,
    playTrack,
    setVolume,
    handleSpotifyStateFromWs,
    dismissNowPlaying,
    clearAuthError,
    refreshStatus: fetchStatus,
  };
}
