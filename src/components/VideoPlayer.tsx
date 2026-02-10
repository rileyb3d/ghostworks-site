"use client";

type VideoPlayerProps = {
  src: string;
  poster?: string;
  className?: string;
};

export function VideoPlayer({ src, poster, className = "" }: VideoPlayerProps) {
  const isYouTube = src.includes("youtube.com") || src.includes("youtu.be");
  const isVimeo = src.includes("vimeo.com");

  if (isYouTube) {
    const videoId = src.includes("youtu.be")
      ? src.split("/").pop()?.split("?")[0]
      : new URL(src).searchParams.get("v");
    return (
      <div className={`aspect-video w-full overflow-hidden bg-black ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  if (isVimeo) {
    const videoId = src.split("/").pop()?.split("?")[0];
    return (
      <div className={`aspect-video w-full overflow-hidden bg-black ${className}`}>
        <iframe
          src={`https://player.vimeo.com/video/${videoId}`}
          title="Video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <video
      src={src}
      poster={poster}
      controls
      autoPlay
      muted
      loop
      playsInline
      className={`aspect-video w-full object-contain bg-black ${className}`}
    />
  );
}
