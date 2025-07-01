//@ts-nocheck
import { useState, useCallback } from "react";
import { ClaudeAPIService } from "../services/claudeAPI";
import { googleCalendarService } from "../services/googleCalendar";
import type { Message, ClaudeConfig, Attachment } from "../types";

export const useClaudeChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
 const [waitingForDeleteDetails, setWaitingForDeleteDetails] = useState(false);
const [waitingForDeleteConfirmation, setWaitingForDeleteConfirmation] = useState(false);
const [waitingForDeleteChoice, setWaitingForDeleteChoice] = useState(false);
const [foundEventsToDelete, setFoundEventsToDelete] = useState<any[]>([]);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const claudeService = new ClaudeAPIService(apiKey);

  // 🆕 DÉTECTION : Mots-clés pour lire l'agenda
  const detectCalendarKeywords = (text: string): boolean => {
    const keywords = [
      // Français
      "agenda",
      "calendrier",
      "planning",
      "rendez-vous",
      "rdv",
      "événements",
      "événement",
      // Anglais
      "calendar",
      "schedule",
      "appointment",
      "appointments",
      "meeting",
      "meetings",
      "events",
      "event",
    ];

    const lowerText = text.toLowerCase();
    return keywords.some((keyword) => lowerText.includes(keyword));
  };

  // 🆕 DÉTECTION : Ajouter un événement
  const detectAddEventKeywords = (text: string): boolean => {
    const lowerText = text.toLowerCase();

    // Français
    const frenchPatterns = [
      "ajoute un événement",
      "ajouter événement",
      "ajoute événement",
      "ajoute un rdv",
      "ajouter rdv",
      "ajoute rdv",
    ];

    // Anglais
    const englishPatterns = [
      "add an event",
      "add event",
      "create an event",
      "create event",
    ];

    const allPatterns = [...frenchPatterns, ...englishPatterns];
    return allPatterns.some((pattern) => lowerText.includes(pattern));
  };

  // 🆕 FONCTION : Extraire les infos d'un événement avec Claude
  const extractEventInfo = async (text: string): Promise<any> => {
    try {
      const extractionPrompt = `
Analyse cette demande et extrait les informations pour créer un événement Google Calendar.

Demande: "${text}"

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "title": "titre de l'événement",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": 60,
  "description": "description optionnelle"
}

Règles:
- Si pas de date précise, utilise demain
- Si pas d'heure précise, utilise 09:00
- Si pas de durée précise, utilise 60 minutes
- Le titre doit être descriptif
- Si "matin" = 09:00, "après-midi" = 14:00, "soir" = 18:00

Exemple:
"Ajoute un RDV avec Marie demain à 14h" → 
{
  "title": "RDV avec Marie",
  "date": "2025-07-02",
  "time": "14:00", 
  "duration": 60,
  "description": "Rendez-vous avec Marie"
}
`;

      const extractionMessages = [
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: extractionPrompt,
            },
          ],
        },
      ];

      const extraction = await claudeService.sendMessage(extractionMessages, {
        model: "claude-sonnet-4-20250514",
        maxTokens: 300,
      });

      // Parser le JSON de Claude
      const jsonMatch = extraction.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Impossible d'extraire les informations de l'événement");
    } catch (error) {
      console.error("❌ Erreur extraction événement:", error);
      throw error;
    }
  };

  // 🆕 FONCTION : Créer un événement Google Calendar
  const createCalendarEvent = async (eventInfo: any): Promise<string> => {
    try {
      // Construire les dates de début et fin
      const startDateTime = new Date(`${eventInfo.date}T${eventInfo.time}:00`);
      const endDateTime = new Date(
        startDateTime.getTime() + eventInfo.duration * 60000
      );

      const event = {
        summary: eventInfo.title,
        description: eventInfo.description || "",
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Europe/Paris",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "Europe/Paris",
        },
      };

      const createdEvent = await googleCalendarService.createEvent(event);

      const formattedDate = startDateTime.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return `\n\n✅ **Événement créé avec succès !**\n\n📅 **${eventInfo.title}**\n🕐 ${formattedDate}\n⏱️ Durée: ${eventInfo.duration} minutes\n\nL'événement a été ajouté à votre Google Calendar.`;
    } catch (error) {
      console.error("❌ Erreur création événement:", error);
      return `\n\n❌ **Erreur lors de la création de l'événement:** ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`;
    }
  };

  // FONCTION EXISTANTE : Récupérer et formater les événements
  const getCalendarEvents = async (): Promise<string> => {
    try {
      const events = await googleCalendarService.getEvents(10);

      if (events.length === 0) {
        return "\n\n📅 **Agenda :** Aucun événement trouvé dans votre calendrier.";
      }

      let calendarText = "\n\n📅 **Voici vos prochains rendez-vous :**\n\n";

      events.forEach((event, index) => {
        const title = event.summary || "Sans titre";
        let dateTime = "";

        if (event.start?.dateTime) {
          const date = new Date(event.start.dateTime);
          dateTime = date.toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } else if (event.start?.date) {
          const date = new Date(event.start.date);
          dateTime =
            date.toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }) + " (toute la journée)";
        }

        calendarText += `**${index + 1}.** ${title}\n`;
        calendarText += `📅 ${dateTime}\n`;
        if (event.location) {
          calendarText += `📍 ${event.location}\n`;
        }
        calendarText += "\n";
      });

      return calendarText;
    } catch (error) {
      console.error("❌ Erreur récupération agenda:", error);
      return "\n\n📅 **Agenda :** Impossible de récupérer vos événements pour le moment.";
    }
  };

  const sendMessage = useCallback(
    async (
      content: string,
      attachments: Attachment[] = [],
      config: ClaudeConfig
    ) => {
      if (!content.trim() && attachments.length === 0) return;

      setError(null);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
        attachments,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      try {
        let enhancedContent = content;
        let actionPerformed = false;

        // 🔍 DEBUG
        console.log("🔍 Message reçu:", content);
        console.log("🔍 Détection add event:", detectAddEventKeywords(content));
        console.log("🔍 État waitingForEventDetails:", waitingForEventDetails);

        // 🔍 PRIORITÉ 1 : Si on attend les détails d'un événement
        if (waitingForEventDetails) {
          console.log("📝 Traitement des détails d'événement...");
          try {
            const eventInfo = await extractEventInfo(content);
            const creationResult = await createCalendarEvent(eventInfo);
            enhancedContent = creationResult;
            setWaitingForEventDetails(false);
            actionPerformed = true;
          } catch (error) {
            console.error("❌ Erreur création:", error);
            enhancedContent = `❌ Impossible de créer l'événement: ${
              error instanceof Error ? error.message : "Erreur inconnue"
            }`;
            setWaitingForEventDetails(false);
            actionPerformed = true;
          }
        }
        // 🆕 PRIORITÉ 2 : Détecter "ajouter événement"
        else if (detectAddEventKeywords(content)) {
          console.log("🆕 Demande d'ajout d'événement détectée...");
          const isEnglish =
            content.toLowerCase().includes("add") ||
            content.toLowerCase().includes("create");
          enhancedContent = isEnglish
            ? "OK, I'm listening! Tell me your event details."
            : "OK, je t'écoute ! Dis-moi les détails de ton événement.";
          setWaitingForEventDetails(true);
          actionPerformed = true;
        }
        // 🟢 PRIORITÉ 3 : Afficher l'agenda
        else if (detectCalendarKeywords(content)) {
          console.log("📅 Lecture agenda détectée (FR/EN)...");
          const calendarData = await getCalendarEvents();
          enhancedContent = content + calendarData;
          actionPerformed = true;
        }

        // 🟢 SI on a fait une action (agenda/événement), on n'envoie PAS à Claude
        if (actionPerformed) {
          // Créer directement la réponse sans passer par Claude
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: enhancedContent,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          // 🟢 SINON, on envoie à Claude normalement
          const claudeMessages = ClaudeAPIService.prepareMessages([
            ...updatedMessages.slice(0, -1),
            { ...userMessage, content: enhancedContent },
          ]);

          const response = await claudeService.sendMessage(claudeMessages, config);

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: response,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);

        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `❌ Erreur: ${errorMessage}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, claudeService]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
};