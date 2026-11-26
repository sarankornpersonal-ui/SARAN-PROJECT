import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, Loader2, Volume2 } from "lucide-react";
import type { NolanEngineMode, SpokenLanguage } from "../types/assistant";
import { AppleSettingsLiquidGlassIcon } from "./AppGridWorkspace";
import { IosFullScreenApp } from "./IosFullScreenApp";
import { LiquidSegmentedControl, LiquidToggle } from "./LiquidToggle";

interface SettingsAppPopupProps {
  language: SpokenLanguage;
  engineMode: NolanEngineMode;
  autoGreeting: boolean;
  bottomAuraEnabled: boolean;
  spotifyCallbackUrl?: string;
  onChangeLanguage: (lang: SpokenLanguage) => void;
  onChangeEngine: (engine: NolanEngineMode) => void;
  onToggleAutoGreeting: (enabled: boolean) => void;
  onToggleBottomAura: (enabled: boolean) => void;
  onClose: () => void;
}

export function SettingsAppPopup({
  language,
  engineMode,
  autoGreeting,
  bottomAuraEnabled,
  spotifyCallbackUrl,
  onChangeLanguage,
  onChangeEngine,
  onToggleAutoGreeting,
  onToggleBottomAura,
  onClose,
}: SettingsAppPopupProps) {
  const prefersReducedMotion = useReducedMotion();
  const isThai = language === "th";
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    setVoiceNote(null);
    try {
      const res = await fetch("/api/tts-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          await audio.play();
          setIsTestingVoice(false);
          return;
        }
      }
    } catch {
      // fall through to browser male speech synthesis fallback
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const sample = isThai
        ? "สวัสดีครับ ผมโนแลน พร้อมช่วยคุณเสมอครับ"
        : "Hi there! I am Nolan, ready to help whenever you need.";
      const u = new SpeechSynthesisUtterance(sample);
      u.lang = isThai ? "th-TH" : "en-US";
      u.pitch = 0.85;
      u.rate = 0.96;
      u.onend = () => setIsTestingVoice(false);
      u.onerror = () => setIsTestingVoice(false);
      window.speechSynthesis.speak(u);
      setVoiceNote(
        isThai
          ? "ทดสอบด้วยเสียงสำรองของเบราว์เซอร์"
          : "Playing male browser voice preview"
      );
      return;
    }

    setIsTestingVoice(false);
  };

  const handleCopyUri = () => {
    const uri =
      spotifyCallbackUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/api/auth/spotify/callback`
        : "");
    if (!uri) return;
    navigator.clipboard.writeText(uri).then(() => {
      setCopiedUri(true);
      window.setTimeout(() => setCopiedUri(false), 2000);
    });
  };

  return (
    <IosFullScreenApp
      title={isThai ? "การตั้งค่า" : "Settings"}
      language={language}
      icon={<AppleSettingsLiquidGlassIcon size="sm" />}
      onClose={onClose}
    >
      <div className="space-y-3.5">
        {/* Language Selector */}
        <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm sm:text-base font-medium text-zinc-900">
              {isThai ? "ภาษาที่ใช้สนทนา" : "Spoken Language"}
            </p>
            <p className="text-xs text-zinc-500">
              {isThai ? "สลับภาษาได้ทันที" : "Switch voice language"}
            </p>
          </div>
          <LiquidSegmentedControl
            layoutId="settings-language-pill"
            ariaLabel="Language"
            value={language}
            onChange={onChangeLanguage}
            options={[
              { value: "th", label: "ภาษาไทย" },
              { value: "en", label: "English" },
            ]}
          />
        </div>

        {/* Engine Mode Selector */}
        <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm sm:text-base font-medium text-zinc-900">
              {isThai ? "โหมดเสียง Nolan" : "Nolan Voice Mode"}
            </p>
            <p className="text-xs text-zinc-500">
              {isThai ? "โหมดปกติไม่ต้องรอเครดิต" : "Standard mode needs no credits"}
            </p>
          </div>
          <LiquidSegmentedControl
            layoutId="settings-engine-pill"
            ariaLabel="Voice engine mode"
            value={engineMode}
            onChange={onChangeEngine}
            options={[
              { value: "gemma-open", label: isThai ? "เสียง Nolan" : "Nolan Voice" },
              { value: "gemini-live", label: "Gemini Live" },
            ]}
          />
        </div>

        {/* Sliding Toggle: Auto Greeting */}
        <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm sm:text-base font-medium text-zinc-900">
              {isThai ? "เสียงทักทายอัตโนมัติ" : "Auto Greeting"}
            </p>
            <p className="text-xs text-zinc-500">
              {isThai
                ? "ให้โนแลนทักทายเมื่อเริ่มการสนทนา"
                : "Greet warmly when starting a session"}
            </p>
          </div>
          <LiquidToggle
            checked={autoGreeting}
            onChange={onToggleAutoGreeting}
            ariaLabel={isThai ? "เปิดเสียงทักทายอัตโนมัติ" : "Toggle auto greeting"}
          />
        </div>

        {/* Sliding Toggle: Bottom AI Gradient Aura */}
        <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm sm:text-base font-medium text-zinc-900">
              {isThai ? "แอนิเมชันไล่สี AI ด้านล่าง" : "Bottom AI Gradient Aura"}
            </p>
            <p className="text-xs text-zinc-500">
              {isThai
                ? "แสงไล่สีเคลื่อนไหวด้านล่างเมื่อเรียกใช้โนแลน"
                : "Luminous gradient glow while Nolan is active"}
            </p>
          </div>
          <LiquidToggle
            checked={bottomAuraEnabled}
            onChange={onToggleBottomAura}
            accent="emerald"
            ariaLabel={
              isThai ? "เปิดแอนิเมชันไล่สี AI ด้านล่าง" : "Toggle bottom AI gradient aura"
            }
          />
        </div>

        {/* Test Voice Preview */}
        <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-medium text-zinc-900">
              {isThai ? "ทดสอบเสียงพูดผู้ชาย (Charon)" : "Test Male Voice (Charon)"}
            </p>
            {voiceNote && <p className="text-xs text-zinc-500">{voiceNote}</p>}
          </div>
          <motion.button
            type="button"
            disabled={isTestingVoice}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            onClick={() => void handleTestVoice()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full liquid-glass-button text-xs sm:text-sm font-medium text-zinc-800 hover:text-blue-700 cursor-pointer disabled:opacity-50"
          >
            {isTestingVoice ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4 text-blue-600" aria-hidden="true" />
            )}
            <span>{isThai ? "ฟังตัวอย่างเสียง" : "Play Sample"}</span>
          </motion.button>
        </div>

        {/* Spotify Redirect URI Diagnostic Row */}
        <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm font-medium text-zinc-700">
              {isThai
                ? "ลิงก์ Redirect URI สำหรับ Spotify Dashboard"
                : "Spotify OAuth Redirect URI"}
            </p>
            <button
              type="button"
              onClick={handleCopyUri}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full liquid-glass-button text-xs font-medium text-zinc-800 hover:text-blue-700 cursor-pointer"
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
          <p className="font-mono text-xs text-zinc-500 truncate select-all">
            {spotifyCallbackUrl ||
              (typeof window !== "undefined"
                ? `${window.location.origin}/api/auth/spotify/callback`
                : "")}
          </p>
        </div>
      </div>
    </IosFullScreenApp>
  );
}
