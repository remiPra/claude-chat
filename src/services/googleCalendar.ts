export interface CalendarEvent {
  id?: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
}
export class GoogleCalendarService {
  private accessToken: string | null = null;

  constructor() {
    // Le token sera défini après la connexion
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  async getEvents(maxResults = 10): Promise<CalendarEvent[]> {
    if (!this.accessToken) {
      throw new Error('Pas connecté à Google Calendar');
    }

    try {
      const now = new Date().toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `orderBy=startTime&singleEvents=true&timeMin=${now}&maxResults=${maxResults}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur Calendar API: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('❌ Erreur getEvents:', error);
      throw error;
    }
  }

  async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    if (!this.accessToken) {
      throw new Error('Pas connecté à Google Calendar');
    }

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur création événement: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erreur createEvent:', error);
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();