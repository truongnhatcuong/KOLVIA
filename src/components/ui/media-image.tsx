"use client";
import Image from "next/image";
import { useState } from "react";
import { initials } from "@/lib/format";
export function MediaImage({
  src,
  alt,
  className = "",
  fallback,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
  sizes?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <span className={`media-image ${className}`}>
      {src && src !== failedSource ? (
        <Image
          unoptimized={/^(https?:|blob:|data:)/.test(src)}
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span className="image-fallback" aria-label={alt}>
          {fallback ?? initials(alt)}
        </span>
      )}
    </span>
  );
}
