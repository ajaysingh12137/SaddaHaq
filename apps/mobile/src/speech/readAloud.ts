import Speech from '@mhpdev/react-native-speech';
import { useCallback, useEffect, useState } from 'react';

import { type Language } from '@saddahaq/shared';

import { speechLocale } from '../i18n';
import { useSession } from '../state/sessionStore';

export type SpeakResult = 'ok' | 'no_voice' | 'error';

/** Speaks text with the phone's own TTS engine. Nothing leaves the device. */
export async function speak(text: string, language: Language, rate: number): Promise<SpeakResult> {
  try {
    const voices = await Speech.getAvailableVoices(language);
    if (voices.length === 0) {
      return 'no_voice';
    }
    await Speech.stop();
    await Speech.speak(text, { language: speechLocale(language), rate });
    return 'ok';
  } catch {
    return 'error';
  }
}

export function stopSpeaking(): Promise<void> {
  return Speech.stop().catch(() => undefined);
}

export function openVoiceInstaller(): Promise<void> {
  return Speech.openVoiceDataInstaller().catch(() => undefined);
}

/** Toggle read-aloud for one block of text; stops when the screen unmounts. */
export function useReadAloud(text: string) {
  const language = useSession(s => s.language);
  const rate = useSession(s => s.speechRate);
  const [speaking, setSpeaking] = useState(false);
  const [problem, setProblem] = useState<Exclude<SpeakResult, 'ok'> | null>(null);

  useEffect(() => {
    const done = () => setSpeaking(false);
    const subscriptions = [Speech.onFinish(done), Speech.onStopped(done), Speech.onError(done)];
    return () => {
      subscriptions.forEach(s => s.remove());
      void stopSpeaking();
    };
  }, []);

  const toggle = useCallback(async () => {
    if (speaking) {
      await stopSpeaking();
      setSpeaking(false);
      return;
    }
    const result = await speak(text, language, rate);
    setProblem(result === 'ok' ? null : result);
    setSpeaking(result === 'ok');
  }, [speaking, text, language, rate]);

  return { speaking, problem, toggle };
}
