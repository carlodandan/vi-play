import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import type {
  StreamSource,
  StreamSubtitle,
  VylaStreamEvent,
} from "../types/media.ts";
import { isMp4Stream, streamMediaSources } from "../services/vylaApi.ts";

export interface UseStreamPlayerProps {
  tmdbId: number | null;
  mediaType?: "movie" | "tv" | "anime";
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
  mediaType = "movie",
  season,
  episode,
  autoStart = true,
}: UseStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Synchronous mirrors for async event callbacks
  const sourcesRef = useRef<StreamSource[]>([]);
  const activeSourceRef = useRef<StreamSource | null>(null);
  const failedUrlsRef = useRef<Set<string>>(new Set());
  const waitingForNextSourceRef = useRef(false);
  const hasStartedPlaybackRef = useRef(false);
  const isDoneRef = useRef(false);
  const sourcesCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const watchdogTimerRef = useRef<number | null>(null);
  const videoListenersCleanupRef = useRef<(() => void) | null>(null);
  const playSourceRef = useRef<
    (source: StreamSource, resumeTime?: number) => void
  >(() => {});
  const tryFallbackSourceRef = useRef<
    (source: StreamSource, reason?: string) => void
  >(() => {});

  const [sources, setSources] = useState<StreamSource[]>([]);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
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
  const [retryGeneration, setRetryGeneration] = useState(0);

  // Clean up HLS instance safely
  const destroyHls = () => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        // Ignore destroy errors
      }
      hlsRef.current = null;
    }
  };

  // Clear connection watchdog timer
  const clearWatchdog = () => {
    if (watchdogTimerRef.current) {
      window.clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  };

  // Fallback to next working provider
  const tryFallbackSource = useCallback(
    (failedSource: StreamSource, reason?: string) => {
      console.warn(
        `Source failed: ${failedSource.label} (${reason || "unspecified error"}). Triggering automatic failover…`,
      );

      // Mark source URL as failed
      failedUrlsRef.current.add(failedSource.url);
      setFailedUrls(Array.from(failedUrlsRef.current));

      // Capture playback position before resetting
      const video = videoRef.current;
      if (video && video.currentTime > 3) {
        lastTimeRef.current = video.currentTime;
      }

      destroyHls();
      clearWatchdog();
      if (videoListenersCleanupRef.current) {
        videoListenersCleanupRef.current();
        videoListenersCleanupRef.current = null;
      }

      // Find next available untried source in sources list
      const next = sourcesRef.current.find(
        (s) => !failedUrlsRef.current.has(s.url),
      );

      if (next) {
        setStatusMessage(
          `${failedSource.label} unavailable. Switching to ${next.label}…`,
        );
        setIsLoading(true);
        playSourceRef.current(next, lastTimeRef.current);
      } else {
        // If no untried sources are currently present:
        if (!isDoneRef.current) {
          // The SSE scraper is still running in the background!
          waitingForNextSourceRef.current = true;
          setIsLoading(true);
          setStatusMessage(
            `${failedSource.label} failed. Resolving alternate streaming server…`,
          );
        } else {
          // All sources have resolved and every single one failed
          waitingForNextSourceRef.current = false;
          setIsLoading(false);
          setStatusMessage("All resolved stream providers failed.");
          setError(
            "All available stream servers failed to play. Please try again or choose another title.",
          );
        }
      }
    },
    [],
  );

  // Play a specific resolved source
  const playSource = useCallback(
    (sourceToPlay: StreamSource, resumeTime = 0) => {
      const video = videoRef.current;
      if (!video) return;

      activeSourceRef.current = sourceToPlay;
      setActiveSource(sourceToPlay);
      setQualityLevels([]);
      setCurrentQuality(-1);
      setIsLoading(true);
      setStatusMessage(`Connecting to ${sourceToPlay.label}…`);

      destroyHls();
      clearWatchdog();

      // Clean up previous event listeners on the video element
      if (videoListenersCleanupRef.current) {
        videoListenersCleanupRef.current();
        videoListenersCleanupRef.current = null;
      }

      // Start 9-second watchdog timer to catch hung connections or silent stalls
      watchdogTimerRef.current = window.setTimeout(() => {
        console.warn(
          `Source ${sourceToPlay.label} stalled (no response within 9s). Falling back…`,
        );
        tryFallbackSourceRef.current(sourceToPlay, "Connection timed out");
      }, 9000);

      // Setup video element event listeners
      const onPlaying = () => {
        clearWatchdog();
        setIsLoading(false);
        setError(null);
      };

      const onCanPlay = () => {
        clearWatchdog();
        setIsLoading(false);
        setError(null);
        if (resumeTime > 0 && Math.abs(video.currentTime - resumeTime) > 2) {
          try {
            video.currentTime = resumeTime;
          } catch {
            // Ignore seek errors
          }
        }
      };

      const onTimeUpdate = () => {
        if (video.currentTime > 2) {
          lastTimeRef.current = video.currentTime;
        }
      };

      const onVideoError = () => {
        clearWatchdog();
        const code = video.error?.code;
        const msg = video.error?.message;
        tryFallbackSourceRef.current(
          sourceToPlay,
          msg || (code ? `Video element error code ${code}` : "Video error"),
        );
      };

      video.addEventListener("playing", onPlaying);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("error", onVideoError);

      videoListenersCleanupRef.current = () => {
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("error", onVideoError);
      };

      const isMp4 = isMp4Stream(sourceToPlay.url);

      if (isMp4) {
        video.src = sourceToPlay.url;
        if (resumeTime > 0) {
          try {
            video.currentTime = resumeTime;
          } catch {}
        }
        video.play().catch(() => {});
        setStatusMessage(`Playing via ${sourceToPlay.label} (MP4 direct)`);
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
        let consecutiveNetworkErrors = 0;
        let consecutiveMediaErrors = 0;

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          clearWatchdog();
          setIsLoading(false);
          setError(null);
          setStatusMessage(`Playing via ${sourceToPlay.label}`);

          if (resumeTime > 0 && Math.abs(video.currentTime - resumeTime) > 2) {
            try {
              video.currentTime = resumeTime;
            } catch {}
          }

          video.play().catch(() => {});

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
          const httpCode = (err.response as any)?.code;
          // Immediate fatal on HTTP 400+ (403 Forbidden, 404 Not Found, 502 Gateway Error)
          if (httpCode && httpCode >= 400) {
            clearWatchdog();
            destroyHls();
            tryFallbackSourceRef.current(
              sourceToPlay,
              `HTTP error ${httpCode}`,
            );
            return;
          }

          if (err.fatal) {
            switch (err.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                consecutiveNetworkErrors++;
                if (consecutiveNetworkErrors <= 1) {
                  hls.startLoad();
                } else {
                  clearWatchdog();
                  destroyHls();
                  tryFallbackSourceRef.current(
                    sourceToPlay,
                    `Network error (${err.details || "fatal"})`,
                  );
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                consecutiveMediaErrors++;
                if (consecutiveMediaErrors <= 1) {
                  hls.recoverMediaError();
                } else {
                  clearWatchdog();
                  destroyHls();
                  tryFallbackSourceRef.current(
                    sourceToPlay,
                    `Media decode error (${err.details || "fatal"})`,
                  );
                }
                break;
              default:
                clearWatchdog();
                destroyHls();
                tryFallbackSourceRef.current(
                  sourceToPlay,
                  `Player error (${err.details || "fatal"})`,
                );
                break;
            }
          }
        });

        hls.loadSource(sourceToPlay.url);
        hls.attachMedia(video);
        return;
      }

      // Native HLS support (Safari iOS / macOS)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceToPlay.url;
        if (resumeTime > 0) {
          try {
            video.currentTime = resumeTime;
          } catch {}
        }
        video.play().catch(() => {});
        setStatusMessage(`Playing via ${sourceToPlay.label} (Native HLS)`);
        return;
      }

      // Direct fallback
      video.src = sourceToPlay.url;
      if (resumeTime > 0) {
        try {
          video.currentTime = resumeTime;
        } catch {}
      }
      video.play().catch(() => {});
    },
    [],
  );

  useEffect(() => {
    tryFallbackSourceRef.current = tryFallbackSource;
    playSourceRef.current = playSource;
  }, [tryFallbackSource, playSource]);

  // Switch quality
  const switchQuality = (levelIndex: number) => {
    setCurrentQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

  // Manual source switch by user
  const switchSource = (source: StreamSource) => {
    // Reset failure status if manually selected by the user
    failedUrlsRef.current.delete(source.url);
    setFailedUrls(Array.from(failedUrlsRef.current));
    playSource(source, videoRef.current?.currentTime || 0);
  };

  // Initialize and stream events on tmdbId / season / episode change
  useEffect(() => {
    if (!tmdbId) return;

    hasStartedPlaybackRef.current = false;
    waitingForNextSourceRef.current = false;
    isDoneRef.current = false;
    sourcesCountRef.current = 0;
    lastTimeRef.current = 0;
    sourcesRef.current = [];
    activeSourceRef.current = null;
    failedUrlsRef.current = new Set();

    setSources([]);
    setFailedUrls([]);
    setActiveSource(null);
    setSubtitles([]);
    setQualityLevels([]);
    setCurrentQuality(-1);
    setStatusMessage("Connecting to stream providers…");
    setIsLoading(true);
    setIsDone(false);
    setError(null);

    clearWatchdog();
    if (videoListenersCleanupRef.current) {
      videoListenersCleanupRef.current();
      videoListenersCleanupRef.current = null;
    }

    // Abort previous stream
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    streamMediaSources({
      tmdbId,
      mediaType,
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
          sourcesCountRef.current++;

          setSources((prev) => {
            if (prev.some((s) => s.url === newSource.url)) return prev;
            const updated = [...prev, newSource];
            sourcesRef.current = updated;
            return updated;
          });

          // 1. Initial start: playback hasn't started yet and autoStart is enabled
          // 2. Recovery: default/active source failed and we were waiting for an alternate source
          if (
            (!hasStartedPlaybackRef.current && autoStart) ||
            waitingForNextSourceRef.current
          ) {
            hasStartedPlaybackRef.current = true;
            waitingForNextSourceRef.current = false;
            setError(null);
            playSource(newSource, lastTimeRef.current);
          }
        }

        if (event.type === "done") {
          isDoneRef.current = true;
          setIsDone(true);

          if (waitingForNextSourceRef.current) {
            waitingForNextSourceRef.current = false;
            setIsLoading(false);
            setStatusMessage("All resolved stream providers failed.");
            setError(
              "All available stream servers failed to play. Please try again or choose another title.",
            );
          } else if (!hasStartedPlaybackRef.current) {
            setIsLoading(false);
            if (sourcesCountRef.current === 0) {
              setError("No available streams returned from providers.");
            }
          }
        }

        if (event.type === "error") {
          if (sourcesRef.current.length === 0) {
            setError(event.error || "Failed to resolve stream sources.");
            setIsLoading(false);
          }
        }
      },
    }).catch((err) => {
      if (err.name !== "AbortError") {
        if (sourcesRef.current.length === 0) {
          setError(err.message || "Network error resolving stream.");
          setIsLoading(false);
        }
      }
    });

    return () => {
      controller.abort();
      clearWatchdog();
      if (videoListenersCleanupRef.current) {
        videoListenersCleanupRef.current();
        videoListenersCleanupRef.current = null;
      }
      destroyHls();
    };
  }, [
    tmdbId,
    mediaType,
    season,
    episode,
    autoStart,
    retryGeneration,
    playSource,
  ]);

  return {
    videoRef,
    sources,
    failedUrls,
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
    retry: () => setRetryGeneration((generation) => generation + 1),
  };
}
