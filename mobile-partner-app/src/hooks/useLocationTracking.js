import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { api } from '../api/client';

/**
 * Keeps the partner's currentLat/currentLng fresh on the backend while
 * `enabled` is true. This matters for two reasons: dispatch matching only
 * considers partners with a non-null currentLat/currentLng, and (when
 * `requestId` is set) the customer's live tracking map relies on these
 * same updates arriving over the request's socket room.
 */
export function useLocationTracking(enabled, requestId) {
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      // Push an immediate fix so the partner is matchable right away,
      // rather than waiting for the first watcher callback.
      try {
        const pos = await Location.getCurrentPositionAsync({});
        await sendLocation(pos, requestId);
      } catch {
        // best-effort; the watcher below will retry
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 25 },
        (pos) => sendLocation(pos, requestId)
      );
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [enabled, requestId]);
}

async function sendLocation(pos, requestId) {
  try {
    await api.patch('/partners/me/location', {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading ?? undefined,
      speedKmph: pos.coords.speed != null ? Math.max(0, pos.coords.speed * 3.6) : undefined,
      requestId: requestId || undefined,
    });
  } catch {
    // a single missed location ping isn't worth surfacing to the user
  }
}
