"use client";

import { useRef, useState } from "react";

interface VideoPlayerProps {
  src: string;
  onRequestComment?: (timestampSeconds: number) => void;
}

export function VideoPlayer({ src, onRequestComment }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  function handlePause() {
    setPaused(true);
    const t = Math.floor(videoRef.current?.currentTime ?? 0);
    onRequestComment?.(t);
  }

  return (
    <div className="flex gap-4">
      <video
        ref={videoRef}
        src={src}
        controls
        className="flex-1 rounded-lg bg-black"
        onPause={handlePause}
        onPlay={() => setPaused(false)}
      />
      <aside className="w-80 border-l border-neutral-200 pl-4">
        {paused && <p className="text-sm text-neutral-500">Pausado — comentário vinculado a este ponto.</p>}
        {/* TimelineComments entra aqui na Fase 1 */}
      </aside>
    </div>
  );
}
