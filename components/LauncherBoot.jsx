"use client";

import { useEffect } from "react";

const BOOT_FLAG = "__WPLAY_RENDERER_BOOTED__";

export default function LauncherBoot() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window[BOOT_FLAG]) return;
    window[BOOT_FLAG] = true;

    let cancelled = false;

    const boot = async () => {
      const motionModule = await import("motion");
      const confettiModule = await import("canvas-confetti");
      const notyfModule = await import("notyf");

      if (cancelled) return;

      window.Motion = motionModule;
      window.confetti = confettiModule.default || confettiModule;
      window.Notyf = notyfModule.Notyf;

      await import("../renderer/renderer.js");
    };

    boot().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Falha ao iniciar renderer do launcher:", error);
      window[BOOT_FLAG] = false;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
