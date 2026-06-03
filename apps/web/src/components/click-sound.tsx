"use client";

import { useCallback, useEffect } from "react";

const CLICK_SOUND_SRC = "/media/click.mp3";
const CLICK_SOUND_DURATION_S = 0.5;
const CLICK_SOUND_VOLUME = 0.45;

let audioContext: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let loadPromise: Promise<AudioBuffer> | null = null;
let activeSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

function loadClickBuffer(): Promise<AudioBuffer> {
  if (clickBuffer) return Promise.resolve(clickBuffer);
  loadPromise ??= fetch(CLICK_SOUND_SRC)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`click sound fetch failed: ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .then((data) => getAudioContext().decodeAudioData(data))
    .then((buffer) => {
      clickBuffer = buffer;
      return buffer;
    })
    .catch((error) => {
      loadPromise = null;
      throw error;
    });
  return loadPromise;
}

function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

function playClickBuffer(buffer: AudioBuffer) {
  const ctx = getAudioContext();
  try {
    activeSource?.stop();
  } catch {
    // already stopped
  }
  activeSource?.disconnect();

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = CLICK_SOUND_VOLUME;
  source.connect(gain);
  gain.connect(ctx.destination);

  const duration = Math.min(CLICK_SOUND_DURATION_S, buffer.duration);
  source.start(0, 0, duration);
  activeSource = source;
  source.onended = () => {
    if (activeSource === source) activeSource = null;
  };
}

export function primeClickSound() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  resumeAudioContext();
  void loadClickBuffer();
}

export function useClickSound() {
  useEffect(() => {
    primeClickSound();
  }, []);

  return useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    resumeAudioContext();
    if (clickBuffer) {
      playClickBuffer(clickBuffer);
      return;
    }
    void loadClickBuffer()
      .then(playClickBuffer)
      .catch(() => {});
  }, []);
}
