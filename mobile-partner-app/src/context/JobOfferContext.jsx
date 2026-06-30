import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { getSocket } from '../api/socket';
import { useAuth } from './AuthContext';

const OFFER_WINDOW_SECONDS = 45;

const JobOfferContext = createContext(null);

export function JobOfferProvider({ children }) {
  const { profile, token } = useAuth();
  const [offer, setOffer] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(OFFER_WINDOW_SECONDS);
  const [responding, setResponding] = useState(false);
  const timerRef = useRef(null);

  const clearOffer = useCallback(() => {
    setOffer(null);
    setSecondsLeft(OFFER_WINDOW_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const respond = useCallback(
    async (action) => {
      if (!offer) return;
      setResponding(true);
      try {
        await api.post(`/requests/${offer.id}/respond`, { action });
      } catch {
        // if it's already been taken by another partner, just dismiss --
        // there's nothing actionable left for this partner to do
      } finally {
        setResponding(false);
        clearOffer();
      }
    },
    [offer, clearOffer]
  );

  // Join this partner's personal socket room so job:offer events reach them.
  useEffect(() => {
    if (!token || !profile?.id) return;
    const socket = getSocket();
    if (!socket) return;
    const join = () => socket.emit('join:partner', { partnerId: profile.id });
    if (socket.connected) join();
    socket.on('connect', join);
    return () => socket.off('connect', join);
  }, [token, profile?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onOffer({ request }) {
      setOffer(request);
      setSecondsLeft(OFFER_WINDOW_SECONDS);
    }
    socket.on('job:offer', onOffer);
    return () => socket.off('job:offer', onOffer);
  }, [token]);

  // Countdown: auto-expire (silently reject so the queue moves to the next partner).
  useEffect(() => {
    if (!offer) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [offer]);

  useEffect(() => {
    if (offer && secondsLeft === 0) respond('REJECT');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  return (
    <JobOfferContext.Provider value={{ offer, secondsLeft, responding, respond, clearOffer }}>
      {children}
    </JobOfferContext.Provider>
  );
}

export function useJobOffer() {
  const ctx = useContext(JobOfferContext);
  if (!ctx) throw new Error('useJobOffer must be used within JobOfferProvider');
  return ctx;
}
