/** Computes elapsed active wall time, subtracting completed/current pause. */
export interface TimingCheckpoint {
  startedAtMs: number;
  pausedMs: number;
  pauseSinceMs: number | null;
}
export function elapsedFocusMs(point: TimingCheckpoint, nowMs: number): number {
  const stoppedAt = point.pauseSinceMs ?? nowMs;
  return Math.max(0, stoppedAt - point.startedAtMs - point.pausedMs);
}
