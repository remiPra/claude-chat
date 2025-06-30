import { useRef } from 'react';

export const useKokoroAutoTTS = () => {
  const audioRef = useRef(new Audio());

  const speak = async (text: string, voice: string = 'af_bella') => {
    try {
      const response = await fetch('https://your-kokoro-api.com/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg' // 🟢 Demande bien un mp3
        },
        body: JSON.stringify({
          text,
          voice,
          format: 'mp3' // 🟢 Ajoute le format si ton API l'accepte
        })
      });

      const blob = await response.blob();

      console.log("🎧 BLOB TYPE :", blob.type); // doit être audio/mpeg ou audio/wav
      const audioUrl = URL.createObjectURL(blob);

      const audio = audioRef.current;
      audio.src = audioUrl;

      // Facultatif, mais peut aider :
      audio.load(); // Recharge l'audio
      audio.onloadeddata = () => {
        audio.play().catch(err => {
          console.error("🔴 Erreur lecture audio :", err);
        });
      };

      audio.onerror = (e) => {
        console.error("🔴 audioRef.current.onerror", e);
      };
    } catch (err) {
      console.error("🔴 Erreur Kokoro TTS:", err);
    }
  };

  return { speak, audioRef };
};
