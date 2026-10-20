import { describe, expect, it } from 'vitest';
import { testClock } from '../../test/test-clock.js';
import type { Clock } from '../clock/clock.js';
import type { TokenDenyList } from './token-deny-list.js';

/**
 * The behaviour every `TokenDenyList` adapter must have. Call it from a test file with a
 * factory that builds the adapter on the given clock.
 */
export function describeTokenDenyListContract(
  adapterName: string,
  create: (clock: Clock) => Promise<TokenDenyList>,
): void {
  describe(`TokenDenyList contract: ${adapterName}`, () => {
    async function setup() {
      const time = testClock();
      const denyList = await create(time.clock);
      const inSeconds = (seconds: number) => new Date(time.clock.now().getTime() + seconds * 1000);
      return { denyList, time, inSeconds };
    }

    it('does not deny a jti that was never added', async () => {
      const { denyList } = await setup();

      expect(await denyList.isDenied('jti-unknown')).toBe(false);
    });

    it('denies an added jti until its expiry, and not after', async () => {
      const { denyList, time, inSeconds } = await setup();
      await denyList.add('jti-1', inSeconds(60));

      expect(await denyList.isDenied('jti-1')).toBe(true);
      time.advanceSeconds(59);
      expect(await denyList.isDenied('jti-1')).toBe(true);
      time.advanceSeconds(1);
      expect(await denyList.isDenied('jti-1')).toBe(false);
    });

    it('keeps jtis independent of each other', async () => {
      const { denyList, inSeconds } = await setup();
      await denyList.add('jti-a', inSeconds(60));

      expect(await denyList.isDenied('jti-a')).toBe(true);
      expect(await denyList.isDenied('jti-b')).toBe(false);
    });

    it('accepts the same jti twice', async () => {
      const { denyList, inSeconds } = await setup();
      await denyList.add('jti-1', inSeconds(60));
      await denyList.add('jti-1', inSeconds(60));

      expect(await denyList.isDenied('jti-1')).toBe(true);
    });

    it('sweeps expired entries and keeps live ones, reporting how many it removed', async () => {
      const { denyList, time, inSeconds } = await setup();
      await denyList.add('short', inSeconds(10));
      await denyList.add('short-too', inSeconds(20));
      await denyList.add('long', inSeconds(600));
      time.advanceSeconds(30);

      expect(await denyList.sweepExpired()).toBe(2);

      expect(await denyList.isDenied('long')).toBe(true);
      expect(await denyList.sweepExpired()).toBe(0);
    });
  });
}
