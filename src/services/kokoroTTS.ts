export interface KokoroVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
}

export const KOKORO_VOICES: KokoroVoice[] = [
  { id: 'af_bella', name: 'Bella (Féminin)', language: 'en-US', gender: 'female' },
  { id: 'af_sarah', name: 'Sarah (Féminin)', language: 'en-US', gender: 'female' },
  { id: 'af_nicole', name: 'Nicole (Féminin)', language: 'en-US', gender: 'female' },
  { id: 'af_sky', name: 'Sky (Féminin)', language: 'en-US', gender: 'female' },
  { id: 'af_heart', name: 'Heart (Féminin)', language: 'en-US', gender: 'female' },
  { id: 'am_adam', name: 'Adam (Masculin)', language: 'en-US', gender: 'male' },
];

export class KokoroTTSService {
  private apiKey: string;
  private baseURL = 'https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesizeSpeech(
  text: string, 
  voice = 'af_bella',
  format = 'mp3',
  speed = 1.0
): Promise<Blob> {
  if (!this.apiKey) {
    throw new Error('Clé API Deep Infra manquante');
  }

  if (!text.trim()) {
    throw new Error('Texte vide');
  }

  try {
    console.log('🎵 Kokoro TTS: Génération audio...', { 
      text: text.substring(0, 50) + '...', 
      voice, 
      format, 
      speed 
    });

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.substring(0, 1000),
        preset_voice: [voice], // ✅ Array format
        output_format: format,
        speed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur API Kokoro:', response.status, errorText);
      throw new Error(`Kokoro API Error: ${response.status} - ${errorText}`);
    }

    // ✅ Parser le JSON au lieu d'attendre un blob
    const jsonResponse = await response.json();
    console.log('📦 Réponse Kokoro:', jsonResponse);

    if (!jsonResponse.audio) {
      throw new Error('Pas de données audio dans la réponse');
    }

    // ✅ SOLUTION SIMPLE : Utiliser fetch pour décoder la Data URL
    const audioResponse = await fetch(jsonResponse.audio);
    const audioBlob = await audioResponse.blob();

    console.log('✅ Kokoro TTS: Audio généré', audioBlob.size, 'bytes', audioBlob.type);
    return audioBlob;
    
  } catch (error) {
    console.error('❌ Erreur Kokoro TTS:', error);
    throw error;
  }
}
  // Le reste de ta classe reste identique...
  async synthesizeLongText(
    text: string, 
    voice = 'af_bella',
    format = 'mp3',
    speed = 1.0
  ): Promise<Blob[]> {
    const chunks = this.splitText(text, 800);
    const audioChunks: Blob[] = [];

    console.log(`📝 Traitement de ${chunks.length} chunks pour texte long`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk.trim()) {
        try {
          console.log(`🎵 Chunk ${i + 1}/${chunks.length}:`, chunk.substring(0, 30) + '...');
          const audioBlob = await this.synthesizeSpeech(chunk, voice, format, speed);
          audioChunks.push(audioBlob);
          
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`❌ Erreur chunk ${i + 1}:`, error);
        }
      }
    }

    console.log(`✅ ${audioChunks.length} chunks audio générés sur ${chunks.length}`);
    return audioChunks;
  }

  private splitText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
      
      if (potentialChunk.length <= maxLength) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        
        if (trimmedSentence.length > maxLength) {
          const words = trimmedSentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            const potentialWordChunk = wordChunk + (wordChunk ? ' ' : '') + word;
            
            if (potentialWordChunk.length <= maxLength) {
              wordChunk = potentialWordChunk;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk + '.');
              }
              wordChunk = word;
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          } else {
            currentChunk = '';
          }
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks.filter(chunk => chunk.length > 1);
  }
}