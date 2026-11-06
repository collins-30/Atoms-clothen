"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { canAutoplay, release, reportVisibility } from "@/lib/video-playback";

/**
 * A muted, looping model video that fills its (relatively positioned) parent.
 *
 * - The poster photo shows first; the video fades in once it is actually playing.
 * - The file isn't requested until the video is close to the screen.
 * - It plays only while on screen, and only a few videos play at a time.
 * - With reduced motion / data saver, or if the browser blocks autoplay, the
 *   poster stays (with a play button when `controls` is on).
 */
export default function ProductVideo({
  src,
  poster,
  alt,
  sizes,
  priority = false,
  controls = false,
  weight = 0,
  imageClassName = "",
}: {
  src: string;
  poster: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Show a pause / play button (use on large videos). */
  controls?: boolean;
  /** Extra priority over other videos on the page (editorial videos use 1). */
  weight?: number;
  imageClassName?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const playWhenLoaded = useRef(false);

  // Lazy load: only attach the file once the video is within ~1 screen (and
  // never for reduced motion / data saver, unless the visitor taps play).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          if (canAutoplay()) setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play while visible (through the shared playback limit), pause otherwise.
  useEffect(() => {
    const el = ref.current;
    if (!el || !near) return;
    // React doesn't reliably set the `muted` attribute, which iOS needs for autoplay.
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("muted", "");

    if (playWhenLoaded.current) {
      // The visitor tapped play before the file was attached.
      playWhenLoaded.current = false;
      void el.play().catch(() => {});
    }
    if (!canAutoplay() || userPaused) {
      release(el);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) reportVisibility(el, e.isIntersecting ? e.intersectionRatio : 0, weight);
      },
      { threshold: [0, 0.35, 0.6, 0.85, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      release(el);
    };
  }, [near, userPaused, weight, src]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      setUserPaused(true);
      release(el);
      el.pause();
    } else {
      setUserPaused(false);
      if (near) {
        // A tap is a user gesture, so this works even when autoplay is off.
        void el.play().catch(() => {});
      } else {
        playWhenLoaded.current = true;
        setNear(true);
      }
    }
  };

  return (
    <>
      {poster && (
        <Image src={poster} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${imageClassName}`} />
      )}
      <video
        ref={ref}
        src={near ? src : undefined}
        muted
        loop
        playsInline
        preload={near ? "metadata" : "none"}
        disablePictureInPicture
        aria-label={poster ? undefined : alt}
        aria-hidden={poster ? true : undefined}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEmptied={() => setPlaying(false)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${playing ? "opacity-100" : "opacity-0"} ${imageClassName}`}
      />
      {controls && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          className="absolute right-4 bottom-4 z-10 w-11 h-11 rounded-full bg-background/85 text-foreground backdrop-blur flex items-center justify-center hover:bg-background"
          aria-label={playing ? "Pause video" : "Play video"}
        >
          {playing ? <Pause className="w-4 h-4" strokeWidth={1.6} /> : <Play className="w-4 h-4 translate-x-px" strokeWidth={1.6} />}
        </button>
      )}
    </>
  );
}
