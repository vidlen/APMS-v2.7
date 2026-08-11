import { useEffect, useState } from "react";

// Below this width, workspace/admin tabs switch to a short label and panels
// default to collapsed/full-width. Same breakpoint Home.tsx has used for the
// PCI tab shell since it was first made mobile-responsive.
const NARROW_BREAKPOINT = 640;

function isNarrow(): boolean {
  return typeof window !== "undefined" && window.innerWidth < NARROW_BREAKPOINT;
}

export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(isNarrow);

  useEffect(() => {
    const onResize = () => setNarrow(isNarrow());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return narrow;
}
