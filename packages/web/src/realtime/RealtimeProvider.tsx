import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/auth/AuthProvider';
import {
  noRealtime,
  type ConnectionStatus,
  type RealtimeEvent,
  type RealtimeEvents,
} from './events';

/** Builds the connection; given a way to read the current access token (it is renewed). */
export type CreateRealtime = (getAccessToken: () => string | undefined) => RealtimeEvents;

const RealtimeContext = createContext<RealtimeEvents>(noRealtime);

export function RealtimeProvider({
  create,
  children,
}: {
  create: CreateRealtime;
  children: ReactNode;
}) {
  const { getAccessToken } = useAuth();
  const realtime = useMemo(() => create(getAccessToken), [create, getAccessToken]);
  return <RealtimeContext.Provider value={realtime}>{children}</RealtimeContext.Provider>;
}

/** Calls `listener` for every server push while the calling component is mounted. */
export function useRealtimeEvents(listener: (event: RealtimeEvent) => void): void {
  const realtime = useContext(RealtimeContext);
  const latest = useRef(listener);
  useEffect(() => {
    latest.current = listener;
  });
  useEffect(() => realtime.subscribe((event) => latest.current(event)), [realtime]);
}

/** The connection's current status, kept up to date. */
export function useConnectionStatus(): ConnectionStatus {
  const realtime = useContext(RealtimeContext);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  useEffect(() => realtime.subscribeStatus(setStatus), [realtime]);
  return status;
}

/** Calls `onReconnect` each time the connection comes back after having been lost. */
export function useReconnected(onReconnect: () => void): void {
  const realtime = useContext(RealtimeContext);
  const latest = useRef(onReconnect);
  useEffect(() => {
    latest.current = onReconnect;
  });
  useEffect(() => {
    let lost = false;
    return realtime.subscribeStatus((status) => {
      if (status === 'disconnected') lost = true;
      else if (status === 'connected' && lost) {
        lost = false;
        latest.current();
      }
    });
  }, [realtime]);
}
