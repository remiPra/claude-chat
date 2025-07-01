//@ts-nocheck
export class GeminiTTSService {
  private apiKey: string;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';

 constructor(apiKey: string) {
  this.apiKey = apiKey;
}

// 🚀 NOUVEAU : Fonction avec timeout
private async fetchWithTimeout(url: string, options: any, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini TTS timeout - trop lent');
    }
    throw error;
  }
}

  // 🟢 Fonction pour créer un header WAV correct
  private createWAVHeader(dataLength: number, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Uint8Array {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataLength, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // ByteRate
    view.setUint16(32, numChannels * bitsPerSample / 8, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample

    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataLength, true); // Subchunk2Size

    return new Uint8Array(header);
  }
async synthesizeSpeech(text: string, voiceName = 'Kore'): Promise<Blob> {
  if (!this.apiKey) {
    throw new Error('Clé API Gemini manquante');
  }

  if (!text.trim()) {
    throw new Error('Texte vide');
  }

  try {
    // 🚀 OPTIMISATION : Limiter le texte pour plus de vitesse
    const shortText = text.length > 500 ? text.substring(0, 500) + '...' : text;
    
    console.log('🎵 Gemini TTS: Génération audio...', { 
      text: shortText.substring(0, 50) + '...',
      voice: voiceName,
      length: shortText.length // 🚀 Log de la longueur
    });

    const startTime = Date.now(); // 🚀 Mesurer le temps

    const response = await fetch(`${this.baseURL}/gemini-2.5-flash-preview-tts:generateContent?key=${this.apiKey}`, {
        // const response = await this.fetchWithTimeout(`${this.baseURL}/gemini-2.5-flash-preview-tts:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: shortText // 🚀 Utiliser le texte raccourci
          }]
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini TTS API Error: ${response.status} - ${errorData.error?.message || 'Erreur inconnue'}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      throw new Error("Aucune donnée audio dans la réponse Gemini TTS");
    }

    const base64Audio = data.candidates[0].content.parts[0].inlineData.data;
    
    // Traiter comme du PCM raw et ajouter un header WAV
    const binaryString = atob(base64Audio);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmData[i] = binaryString.charCodeAt(i);
    }

    // Créer le header WAV
    const wavHeader = this.createWAVHeader(pcmData.length, 24000, 1, 16);
    
    // Combiner header + données PCM
    const wavData = new Uint8Array(wavHeader.length + pcmData.length);
    wavData.set(wavHeader, 0);
    wavData.set(pcmData, wavHeader.length);
    
    const audioBlob = new Blob([wavData], { type: 'audio/wav' });
    
    const endTime = Date.now();
    console.log(`✅ Gemini TTS: Audio WAV créé en ${endTime - startTime}ms`, audioBlob.size, 'bytes'); // 🚀 Log du temps

    return audioBlob;

  } catch (error) {
    console.error('❌ Erreur Gemini TTS:', error);
    throw error;
  }
}
}

// 🟢 AJOUTE ça à la fin du fichier :
export interface GeminiVoice {
  id: string;
  name: string;
  description: string;
}

export const GEMINI_VOICES: GeminiVoice[] = [
  { id: 'Zephyr', name: 'Zephyr', description: 'Bright' },
  { id: 'Puck', name: 'Puck', description: 'Upbeat' },
  { id: 'Charon', name: 'Charon', description: 'Informative' },
  { id: 'Kore', name: 'Kore', description: 'Firm' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Excitable' },
  { id: 'Leda', name: 'Leda', description: 'Youthful' },
  { id: 'Orus', name: 'Orus', description: 'Firm' },
  { id: 'Aoede', name: 'Aoede', description: 'Breezy' },
  { id: 'Callirhoe', name: 'Callirhoe', description: 'Easy-going' },
  { id: 'Autonoe', name: 'Autonoe', description: 'Bright' },
  { id: 'Enceladus', name: 'Enceladus', description: 'Breathy' },
  { id: 'Iapetus', name: 'Iapetus', description: 'Clear' },
  { id: 'Umbriel', name: 'Umbriel', description: 'Easy-going' },
  { id: 'Algieba', name: 'Algieba', description: 'Smooth' },
  { id: 'Despina', name: 'Despina', description: 'Smooth' },
];