export const MARKER_RE = /^\s*badge\s*[:：]\s*(.+?)\s*$/;

export function parseBadgeMarker(line: string): string | null {
  const m = MARKER_RE.exec(line);
  return m ? m[1] : null;
}

export interface MarkerRun {
  startLine: number;
  endLine: number;
  names: string[];
}

export function findMarkerRuns(lines: string[]): MarkerRun[] {
  const runs: MarkerRun[] = [];
  let cur: MarkerRun | null = null;
  lines.forEach((line, i) => {
    const name = parseBadgeMarker(line);
    if (name !== null) {
      if (cur && cur.endLine === i - 1) {
        cur.endLine = i;
        cur.names.push(name);
      } else {
        cur = { startLine: i, endLine: i, names: [name] };
        runs.push(cur);
      }
    }
  });
  return runs;
}

export function markerText(badgeName: string): string {
  return `badge: ${badgeName}`;
}
