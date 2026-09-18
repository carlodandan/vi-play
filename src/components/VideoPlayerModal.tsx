import { useEffect, useRef, useState } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Sliders,
  Subtitles,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { MediaItem } from "../types/media.ts";
import { useStreamPlayer } from "../hooks/useStreamPlayer.ts";
import { isMp4Stream } from "../services/vylaApi.ts";

interface VideoPlayerModalProps {
  item: MediaItem;
  season?: number;
  episode?: number;
  onClose: () => void;
  onNavigateEpisode?: (season: number, episode: number) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  item,
  season,
  episode,
  onClose,
  onNavigateEpisode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSourcesMenu, setShowSourcesMenu] = useState(false);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(-1); // -1 = off
  const controlsTimeoutRef = useRef<number | null>(null);

  const isSeries = item.type === "tv" || item.type === "anime";
  const currentSeason = isSeries ? (season ?? 1) : undefined;
  const currentEpisode = isSeries ? (episode ?? 1) : undefined;

  const {
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
    retry,
  } = useStreamPlayer({
    tmdbId: item.id,
    mediaType: item.type,
    season: currentSeason,
    episode: currentEpisode,
  });

  // Handle controls auto-hide
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  // Video playback controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.duration || 0, video.currentTime + seconds),
    );
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Format time (HH:MM:SS or MM:SS)
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Subtitle track selection
  const selectSubtitle = (index: number) => {
    setSelectedSubIndex(index);
    const video = videoRef.current;
    if (!video) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = i === index ? "showing" : "disabled";
    }
    setShowSubtitlesMenu(false);
  };

  // Next / Previous episode calculation
  let hasPrevEpisode = false;
  let hasNextEpisode = false;
  let prevEpNumber = 0;
  let nextEpNumber = 0;

  if (
    isSeries &&
    currentSeason !== undefined &&
    currentEpisode !== undefined &&
    item.seasons
  ) {
    const seasonObj = item.seasons.find(
      (s) => s.season_number === currentSeason,
    );
    if (seasonObj?.episodes) {
      const epIndex = seasonObj.episodes.findIndex(
        (e) => e.episode_number === currentEpisode,
      );
      if (epIndex > 0) {
        hasPrevEpisode = true;
        prevEpNumber = seasonObj.episodes[epIndex - 1].episode_number;
      }
      if (epIndex < seasonObj.episodes.length - 1) {
        hasNextEpisode = true;
        nextEpNumber = seasonObj.episodes[epIndex + 1].episode_number;
      }
    }
  }

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const video = videoRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        if (video) {
          if (video.paused) {
            video.play().catch(() => {});
            setIsPlaying(true);
          } else {
            video.pause();
            setIsPlaying(false);
          }
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (video) video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (video)
          video.currentTime = Math.min(
            video.duration || 0,
            video.currentTime + 10,
          );
      } else if (e.code === "KeyF") {
        e.preventDefault();
        const container = containerRef.current;
        if (container) {
          if (!document.fullscreenElement) {
            container.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
          } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
          }
        }
      } else if (e.code === "KeyM") {
        e.preventDefault();
        if (video) {
          video.muted = !video.muted;
          setIsMuted(video.muted);
        }
      } else if (e.code === "Escape") {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, videoRef]);

  // Video time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoRef]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Top Header Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-40 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white flex items-center justify-center border border-zinc-700/60 backdrop-blur-md transition-all cursor-pointer"
            title="Back / Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {item.title}
            </h2>
            {isSeries && (
              <p className="text-xs text-rose-400 font-medium">
                Season {currentSeason} • Episode {currentEpisode}
              </p>
            )}
          </div>
        </div>

        {/* Top Right Badges */}
        <div className="flex items-center gap-2">
          {activeSource && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60">
              <Activity className="w-3 h-3 text-purple-400" />
              {activeSource.label} (
              {isMp4Stream(activeSource.url) ? "MP4" : "HLS"})
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900/80 text-zinc-400 border border-zinc-800">
            Entertainment Only
          </span>
        </div>
      </div>

      {/* Main Video Element */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
          crossOrigin="anonymous"
        >
          {subtitles.map((sub, i) => (
            <track
              key={`${sub.label}-${i}`}
              kind="subtitles"
              label={sub.label}
              src={sub.file}
              srcLang={sub.label.slice(0, 2).toLowerCase()}
              default={i === selectedSubIndex}
            />
          ))}
        </video>

        {/* Loading Spinner / SSE Status */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20 space-y-4">
            <div className="relative w-14 h-14">
              <div className="w-full h-full border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <Play className="w-5 h-5 text-purple-400 fill-purple-400 absolute inset-0 m-auto" />
            </div>
            <p className="text-sm font-medium text-zinc-200 animate-pulse text-center max-w-sm px-4">
              {statusMessage}
            </p>
            <span className="text-xs text-zinc-400">
              Querying streaming providers via Vyla API…
            </span>
          </div>
        )}

        {/* Error Fallback Banner */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-20 p-6 space-y-4 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500" />
            <h3 className="text-lg font-bold text-white">Stream Unavailable</h3>
            <p className="text-sm text-zinc-400 max-w-md">
              {error}. Please check your Cloudflare Worker URL or self-hosted
              Vyla API status in Settings.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={retry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors cursor-pointer"
              >
                Close Player
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Overlay */}
      <div
        className={`absolute bottom-0 inset-x-0 z-40 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 space-y-2.5 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono w-11 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.5"
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1.5 bg-zinc-700/80 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:h-2 transition-all"
          />
          <span className="text-xs text-zinc-400 font-mono w-11">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {hasPrevEpisode && onNavigateEpisode && season !== undefined && (
              <button
                onClick={() => onNavigateEpisode(season, prevEpNumber)}
                className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
                title={`Previous Episode (E${prevEpNumber})`}
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => seek(-10)}
              className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title="Skip back 10s (Left Arrow)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => seek(10)}
              className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title="Skip forward 10s (Right Arrow)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {hasNextEpisode && onNavigateEpisode && season !== undefined && (
              <button
                onClick={() => onNavigateEpisode(season, nextEpNumber)}
                className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
                title={`Next Episode (E${nextEpNumber})`}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={toggleMute}
              className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title={isMuted ? "Unmute (M)" : "Mute (M)"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Right Actions: Sources, Quality, Subtitles, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Sources Switcher Popover */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSourcesMenu(!showSourcesMenu);
                  setShowQualityMenu(false);
                  setShowSubtitlesMenu(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  showSourcesMenu || sources.length > 0
                    ? "bg-zinc-900 border-zinc-700 text-purple-300"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
                }`}
                title="Switch Streaming Provider"
              >
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">
                  Sources ({sources.length})
                </span>
              </button>

              {showSourcesMenu && (
                <div className="absolute bottom-11 right-0 w-64 bg-zinc-950 border border-zinc-800 rounded-xl p-2 shadow-2xl space-y-1 max-h-56 overflow-y-auto">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-2 py-1">
                    Resolved Providers {isDone ? "(Complete)" : "(Resolving…)"}
                  </div>
                  {sources.length === 0 ? (
                    <div className="text-xs text-zinc-500 p-2">
                      Waiting for providers…
                    </div>
                  ) : (
                    sources.map((src) => {
                      const isCur = activeSource?.url === src.url;
                      return (
                        <button
                          key={src.url}
                          onClick={() => {
                            switchSource(src);
                            setShowSourcesMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                            isCur
                              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                              : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{src.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 ml-2">
                            {isMp4Stream(src.url) ? "MP4" : "HLS"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Quality Selector Popover */}
            {qualityLevels.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSourcesMenu(false);
                    setShowSubtitlesMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                  title="Video Quality"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>
                    {currentQuality === -1
                      ? "Auto"
                      : qualityLevels[currentQuality]?.label || "Quality"}
                  </span>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-11 right-0 w-36 bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 shadow-2xl space-y-1">
                    <button
                      onClick={() => {
                        switchQuality(-1);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                        currentQuality === -1
                          ? "bg-purple-600/20 text-purple-300"
                          : "text-zinc-300 hover:bg-zinc-900"
                      }`}
                    >
                      Auto
                    </button>
                    {qualityLevels.map((lvl) => (
                      <button
                        key={lvl.index}
                        onClick={() => {
                          switchQuality(lvl.index);
                          setShowQualityMenu(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                          currentQuality === lvl.index
                            ? "bg-purple-600/20 text-purple-300"
                            : "text-zinc-300 hover:bg-zinc-900"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subtitles Popover */}
            {subtitles.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSubtitlesMenu(!showSubtitlesMenu);
                    setShowSourcesMenu(false);
                    setShowQualityMenu(false);
                  }}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    selectedSubIndex >= 0
                      ? "bg-purple-950/60 border-purple-600 text-purple-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300"
                  }`}
                  title="Subtitles"
                >
                  <Subtitles className="w-4 h-4" />
                </button>

                {showSubtitlesMenu && (
                  <div className="absolute bottom-11 right-0 w-44 bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 shadow-2xl space-y-1 max-h-56 overflow-y-auto">
                    <button
                      onClick={() => selectSubtitle(-1)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                        selectedSubIndex === -1
                          ? "bg-purple-600/20 text-purple-300"
                          : "text-zinc-300 hover:bg-zinc-900"
                      }`}
                    >
                      Off
                    </button>
                    {subtitles.map((sub, i) => (
                      <button
                        key={`${sub.label}-${i}`}
                        onClick={() => selectSubtitle(i)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left truncate transition-colors cursor-pointer ${
                          selectedSubIndex === i
                            ? "bg-purple-600/20 text-purple-300"
                            : "text-zinc-300 hover:bg-zinc-900"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
