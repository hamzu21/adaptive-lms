import { useMemo } from "react";

interface LessonVideoPlayerProps {
  videoUrl?: string;
  videoFileUrl?: string;
}

function extractEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

const LessonVideoPlayer = ({ videoUrl, videoFileUrl }: LessonVideoPlayerProps) => {
  const embedSrc = useMemo(() => (videoUrl ? extractEmbedUrl(videoUrl) : null), [videoUrl]);

  if (!embedSrc && !videoFileUrl) return null;

  return (
    <div className="mb-6">
      {embedSrc ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe
            src={embedSrc}
            title="Lesson video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : videoFileUrl ? (
        <video
          src={videoFileUrl}
          controls
          className="w-full rounded-lg bg-muted aspect-video"
        />
      ) : null}
    </div>
  );
};

export default LessonVideoPlayer;
