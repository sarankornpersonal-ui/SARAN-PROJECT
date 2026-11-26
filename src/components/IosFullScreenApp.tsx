import { useEffect, useState } from "react";
import {
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { X } from "lucide-react";
import type { SpokenLanguage } from "../types/assistant";

interface IosFullScreenAppProps {
  title: string;
  language: SpokenLanguage;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

export function IosFullScreenApp({
  title,
  language,
  icon,
  onClose,
  children,
}: IosFullScreenAppProps) {
  const prefersReducedMotion = useReducedMotion();
  const isThai = language === "th";
  const dragControls = useDragControls();
  const dragY = useMotionValue(0);

  // Dynamic window height so drag constraints scale proportionally across mobile and desktop
  const [windowHeight, setWindowHeight] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerHeight : 840
  );
  const [hapticClosing, setHapticClosing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Proportional drag bounds dynamically calculated from viewport height (38% of screen)
  const dragBound = Math.round(Math.max(220, windowHeight * 0.38));
  const dismissThreshold = Math.round(Math.max(65, dragBound * 0.28));

  // As user swipes up or down, scale down and curve corners dynamically
  const dragScale = useTransform(dragY, [-dragBound, 0, dragBound], [0.76, 1, 0.76]);
  const dragRadius = useTransform(
    dragY,
    [-dragBound * 0.7, 0, dragBound * 0.7],
    [48, 0, 48]
  );
  const dragOpacity = useTransform(
    dragY,
    [-dragBound * 1.15, 0, dragBound * 1.15],
    [0.4, 1, 0.4]
  );

  const triggerTactileClose = () => {
    if (hapticClosing) return;
    setHapticClosing(true);

    // Subtle hardware vibration where supported (e.g. Android/Chrome)
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(12);
      } catch {
        // ignore
      }
    }

    if (prefersReducedMotion) {
      onClose();
      return;
    }

    // Play micro tactile pulse then complete dismissal
    window.setTimeout(() => {
      onClose();
    }, 90);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const absOffset = Math.abs(info.offset.y);
    const absVelocity = Math.abs(info.velocity.y);
    if (absOffset > dismissThreshold || absVelocity > 380) {
      triggerTactileClose();
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      drag={prefersReducedMotion ? false : "y"}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: -dragBound, bottom: dragBound }}
      dragElastic={0.32}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
      style={
        prefersReducedMotion
          ? undefined
          : {
              y: dragY,
              scale: dragScale,
              borderRadius: dragRadius,
              opacity: dragOpacity,
            }
      }
      initial={
        prefersReducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              scale: 0.38,
              y: 40,
              borderRadius: 56,
              filter: "blur(8px)",
            }
      }
      animate={
        prefersReducedMotion
          ? { opacity: 1 }
          : {
              opacity: 1,
              scale: 1,
              y: 0,
              borderRadius: 0,
              filter: "blur(0px)",
            }
      }
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              scale: 0.45,
              y: 50,
              borderRadius: 52,
              filter: "blur(6px)",
            }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0.12 }
          : {
              duration: 0.56,
              ease: [0.16, 1, 0.3, 1],
            }
      }
      className="fixed inset-0 z-30 flex flex-col liquid-glass-fullscreen overflow-hidden shadow-2xl"
    >
      {/* Top Drag Grabber + App Header Bar */}
      <div
        onPointerDown={(e) => {
          if (!prefersReducedMotion) dragControls.start(e);
        }}
        className="shrink-0 select-none touch-none px-4 sm:px-8 pt-3 pb-3 border-b border-zinc-200/60 bg-white/55 backdrop-blur-xl cursor-grab active:cursor-grabbing"
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-2.5">
          {/* Top Grabber Pill with tactile visual pulse */}
          <motion.span
            aria-hidden="true"
            animate={
              hapticClosing
                ? {
                    scaleX: [1, 1.35, 0.95],
                    scaleY: [1, 0.75, 1.1],
                    backgroundColor: "rgba(37, 99, 235, 0.75)",
                  }
                : {}
            }
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-10 h-1 rounded-full bg-zinc-300/90"
          />

          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {icon}
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 truncate">
                {title}
              </h1>
            </div>

            {/* Close Button with tactile visual pulse */}
            <motion.button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
              animate={
                hapticClosing
                  ? {
                      scale: [1, 0.82, 1.18, 0.9],
                      boxShadow: [
                        "0 0 0 0 rgba(37, 99, 235, 0)",
                        "0 0 0 6px rgba(37, 99, 235, 0.35)",
                        "0 0 0 0 rgba(37, 99, 235, 0)",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.16, ease: "easeOut" }}
              onClick={triggerTactileClose}
              aria-label={isThai ? `ปิด ${title}` : `Close ${title}`}
              className="relative w-10 h-10 rounded-full inline-flex items-center justify-center liquid-glass-button text-zinc-700 hover:text-zinc-950 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Scrollable Full-Screen App Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-48">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>

      {/* Apple iOS Home Bar Indicator Zone (Swipe gesture active + tactile pulse) */}
      <div
        onPointerDown={(e) => {
          if (!prefersReducedMotion) dragControls.start(e);
        }}
        className="fixed inset-x-0 bottom-[98px] sm:bottom-[104px] z-30 flex flex-col items-center justify-center py-2 select-none touch-none pointer-events-auto cursor-grab active:cursor-grabbing"
      >
        <button
          type="button"
          onClick={triggerTactileClose}
          aria-label={isThai ? "ปิดแอป" : "Close app"}
          className="group flex items-center justify-center px-10 py-3 rounded-full cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <motion.span
            animate={
              hapticClosing
                ? {
                    scaleX: [1, 1.28, 0.95],
                    scaleY: [1, 0.72, 1.15],
                    backgroundColor: "rgba(37, 99, 235, 0.8)",
                  }
                : {}
            }
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-36 sm:w-44 h-1.5 rounded-full bg-zinc-900/35 group-hover:bg-zinc-900/60 group-active:scale-95 transition-all shadow-sm"
          />
        </button>
      </div>
    </motion.div>
  );
}
