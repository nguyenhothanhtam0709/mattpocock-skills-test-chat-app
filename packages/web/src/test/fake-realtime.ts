import type { RealtimeEvent, RealtimeEvents } from '@/realtime/events';

/** In-memory `RealtimeEvents`: the test pushes events with `emit`. */
export function fakeRealtime() {
  const listeners = new Set<(event: RealtimeEvent) => void>();
  const realtime: RealtimeEvents = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    realtime,
    emit: (event: RealtimeEvent) => listeners.forEach((listener) => listener(event)),
    get subscriberCount() {
      return listeners.size;
    },
  };
}
