import type { ConnectionStatus, RealtimeEvent, RealtimeEvents } from '@/realtime/events';

/** In-memory `RealtimeEvents`: the test pushes events with `emit` and flips the connection. */
export function fakeRealtime() {
  const listeners = new Set<(event: RealtimeEvent) => void>();
  const statusListeners = new Set<(status: ConnectionStatus) => void>();
  let status: ConnectionStatus = 'connected';
  const setStatus = (next: ConnectionStatus) => {
    status = next;
    statusListeners.forEach((listener) => listener(next));
  };
  const realtime: RealtimeEvents = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeStatus(listener) {
      statusListeners.add(listener);
      listener(status);
      return () => statusListeners.delete(listener);
    },
  };
  return {
    realtime,
    emit: (event: RealtimeEvent) => listeners.forEach((listener) => listener(event)),
    disconnect: () => setStatus('disconnected'),
    reconnect: () => setStatus('connected'),
    get subscriberCount() {
      return listeners.size;
    },
  };
}
