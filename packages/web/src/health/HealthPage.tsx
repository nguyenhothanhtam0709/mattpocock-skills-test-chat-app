import { CircleCheck, CircleX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchHealth } from '@/api/health';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type State = 'checking' | 'healthy' | 'unavailable';

export function HealthPage() {
  const [state, setState] = useState<State>('checking');

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal).then(
      () => setState('healthy'),
      () => {
        if (!controller.signal.aborted) setState('unavailable');
      },
    );
    return () => controller.abort();
  }, []);

  return (
    <main className="bg-background text-foreground flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>Service status</CardDescription>
        </CardHeader>
        <CardContent>
          {state === 'checking' && <Skeleton className="h-10 w-full" />}
          {state === 'healthy' && (
            <Alert>
              <CircleCheck />
              <AlertTitle>API healthy</AlertTitle>
              <AlertDescription>
                <Badge variant="secondary">database up</Badge>
              </AlertDescription>
            </Alert>
          )}
          {state === 'unavailable' && (
            <Alert variant="destructive">
              <CircleX />
              <AlertTitle>API unavailable</AlertTitle>
              <AlertDescription>The health check failed.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
