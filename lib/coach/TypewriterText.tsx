"use client";

import { useEffect, useState } from "react";

type TypewriterTextProps = {
  text: string;
  speed?: number; // ms per character
  className?: string;
  showCursor?: boolean;
};

export function TypewriterText({
  text,
  speed = 25,
  className,
  showCursor = true,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;

    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayed}
      {showCursor && !done && (
        <span className="animate-pulse" aria-hidden>
          |
        </span>
      )}
    </span>
  );
}
