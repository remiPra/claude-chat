import { useState, useCallback } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { googleCalendarService } from '../services/googleCalendar';
import type { CalendarEvent } from '../services/googleCalendar';

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('✅ Google Calendar connecté:', tokenResponse);
      googleCalendarService.setAccessToken(tokenResponse.access_token);
      setIsConnected(true);
      setError(null);
    },
    onError: (error) => {
      console.error('❌ Erreur connexion Google:', error);
      setError('Erreur de connexion Google');
    },
    scope: 'https://www.googleapis.com/auth/calendar.events',
  });

  const logout = useCallback(() => {
    googleLogout();
    setIsConnected(false);
    setEvents([]);
    setError(null);
    console.log('🔌 Déconnecté de Google Calendar');
  }, []);

  const getEvents = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const calendarEvents = await googleCalendarService.getEvents(10);
      setEvents(calendarEvents);
      console.log('📅 Événements récupérés:', calendarEvents.length);
    } catch (err) {
      setError('Erreur récupération événements');
      console.error('❌ Erreur getEvents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const createEvent = useCallback(async (event: Partial<CalendarEvent>) => {
    if (!isConnected) {
      throw new Error('Pas connecté à Google Calendar');
    }

    setIsLoading(true);
    try {
      const newEvent = await googleCalendarService.createEvent(event);
      console.log('✅ Événement créé:', newEvent);
      await getEvents(); // Refresh la liste
      return newEvent;
    } catch (err) {
      setError('Erreur création événement');
      console.error('❌ Erreur createEvent:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getEvents]);

  return {
    isConnected,
    events,
    isLoading,
    error,
    login,
    logout,
    getEvents,
    createEvent,
  };
};