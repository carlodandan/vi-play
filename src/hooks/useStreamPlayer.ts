import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type {
  StreamSource,
  StreamSubtitle,
  VylaStreamEvent,
} from "../types/media.ts";
import { isMp4Stream, streamMediaSources } from "../services/vylaApi.ts";

export interface UseStreamPlayerProps {
  tmdbId: number | null;
  season?: number;
  episode?: number;
  autoStart?: boolean;
}

export interface StreamQualityLevel {
  index: number;
  height: number;
  bitrate?: number;
  label: string;
}

export function useStreamPlayer({
  tmdbId,
  season,
  episode,
  autoStart = true,
}: UseStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fallbackQueueRef = useRef<StreamSource[]>([]);
  const hasStartedPlaybackRef = useRef(false);

  const [sources, setSources] = useState<StreamSource[]>([]);
  const [activeSource, setActiveSource] = useState<StreamSource | null>(null);
  const [subtitles, setSubtitles] = useState<StreamSubtitle[]>([]);
  const [qualityLevels, setQualityLevels] = useState<StreamQualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [statusMessage, setStatusMessage] = useState<string>(
    "Connecting to stream providers…",
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Clean up HLS instance safely
  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  // Play a specific resolved source
  const playSource = (sourceToPlay: StreamSource) => {
    const video = videoRef.current;
    if (!video) return;

    setActiveSource(sourceToPlay);
    setQualityLevels([]);
    setCurrentQuality(-1);
    setStatusMessage(`Connecting to ${sourceToPlay.label}…`);

    destroyHls();

    const isMp4 = isMp4Stream(sourceToPlay.url);

    if (isMp4) {
      video.src = sourceToPlay.url;
      video.play().catch(() => {});
      setStatusMessage(`Playing via ${sourceToPlay.label} (MP4 direct)`);
      setIsLoading(false);
      return;
    }

    // HLS stream
    if (Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1, // Auto level
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(sourceToPlay.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        video.play().catch(() => {});
        setIsLoading(false);
        setStatusMessage(`Playing via ${sourceToPlay.label} (HLS verified)`);

        if (data.levels && data.levels.length > 1) {
          const levels: StreamQualityLevel[] = data.levels.map(
            (lvl, index) => ({
              index,
              height: lvl.height,
              bitrate: lvl.bitrate,
              label: lvl.height ? `${lvl.height}p` : `Level ${index + 1}`,
            }),
          );
          setQualityLevels(levels);
        }
      });

      hls.on(Hls.Events.ERROR, (_, err) => {
        if (err.fatal) {
          console.warn(
            `Source ${sourceToPlay.label} encountered fatal error:`,
            err,
          );
          destroyHls();
          tryFallbackSource(sourceToPlay.url);
        }
      });

      return;
    }

    // Native HLS support (Safari iOS / macOS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = sourceToPlay.url;
      video.play().catch(() => {});
      setIsLoading(false);
      setStatusMessage(`Playing via ${sourceToPlay.label} (Native HLS)`);
      return;
    }

    // Direct fallback
    video.src = sourceToPlay.url;
    video.play().catch(() => {});
    setIsLoading(false);
  };

  // Fallback to next working provider in queue
  const tryFallbackSource = (failedUrl: string) => {
    fallbackQueueRef.current = fallbackQueueRef.current.filter(
      (s) => s.url !== failedUrl,
    );
    const next = fallbackQueueRef.current.shift();
    if (next) {
      setStatusMessage(
        `Provider failed. Switching to fallback: ${next.label}…`,
      );
      playSource(next);
    } else {
      setStatusMessage("All resolved stream providers failed.");
      setError("Playback failed on all available providers.");
    }
  };

  // Switch quality
  const switchQuality = (levelIndex: number) => {
    setCurrentQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

  // Manual source switch by user
  const switchSource = (source: StreamSource) => {
    playSource(source);
  };

  // Initialize and stream events on tmdbId / season / episode change
  useEffect(() => {
    if (!tmdbId) return;

    hasStartedPlaybackRef.current = false;
    fallbackQueueRef.current = [];

    // Abort previous stream
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    streamMediaSources({
      tmdbId,
      season,
      episode,
      signal: controller.signal,
      onEvent: (event: VylaStreamEvent) => {
        if (event.type === "meta") {
          if (event.subtitles && event.subtitles.length > 0) {
            setSubtitles(event.subtitles);
          }
        }

        if (event.type === "source" && event.source) {
          const newSource = event.source;
          setSources((prev) => {
            if (prev.some((s) => s.url === newSource.url)) return prev;
            return [...prev, newSource];
          });

          // If this is the first source, start playing immediately!
          if (!hasStartedPlaybackRef.current && autoStart) {
            hasStartedPlaybackRef.current = true;
            playSource(newSource);
          } else {
            fallbackQueueRef.current.push(newSource);
          }
        }

        if (event.type === "done") {
          setIsDone(true);
          if (!hasStartedPlaybackRef.current) {
            setIsLoading(false);
            setStatusMessage(
              "No working stream providers found for this title.",
            );
          }
        }

        if (event.type === "error" && event.error) {
          setError(event.error);
        }
      },
    }).catch((err) => {
      if (err.name !== "AbortError") {
        setError(err.message || "Stream connection failed");
        setIsLoading(false);
      }
    });

    return () => {
      controller.abort();
      destroyHls();
    };
  }, [tmdbId, season, episode, autoStart]);

  return {
    videoRef,
    sources,
    activeSource,
    subtitles,
    qualityLevels,
    currentQuality,
    statusMessage,
    isLoading,
    isDone,
    error,
    switchSource,
    switchQuality,
    retry: () => {
      if (sources.length > 0) {
        playSource(sources[0]);
      }
    },
  };
}
