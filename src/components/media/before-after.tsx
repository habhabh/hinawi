"use client";

import { useState } from "react";
import Image from "next/image";

export function BeforeAfter({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [split, setSplit] = useState(50);
  return <div className="before-after" style={{ "--split": `${split}%` } as React.CSSProperties}>
    <Image src={before} alt={`${alt} — قبل`} fill sizes="100vw" unoptimized />
    <Image className="after" src={after} alt={`${alt} — بعد`} fill sizes="100vw" unoptimized />
    <input aria-label="تحريك المقارنة بين صورة قبل وبعد" type="range" min="0" max="100" value={split} onChange={(event) => setSplit(Number(event.target.value))} />
    <span style={{ position: "absolute", zIndex: 4, top: "1rem", right: "1rem" }}>قبل</span><span style={{ position: "absolute", zIndex: 4, top: "1rem", left: "1rem" }}>بعد</span>
  </div>;
}
