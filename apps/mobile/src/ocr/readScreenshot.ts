/**
 * Screenshot logging: the worker picks an earnings screenshot, ML Kit reads it
 * on the phone, and the shared parser suggests platform, date and amount.
 * Neither the image nor the recognised text is stored or sent anywhere; the
 * native module deletes the picker's resized copy after reading it.
 */
import { launchImageLibrary } from 'react-native-image-picker';

import { type ISODate, type ParsedEarnings, parseEarningsText } from '@saddahaq/shared';

import NativeTextRecognizer from '../specs/NativeTextRecognizer';

export type ReadScreenshotResult =
  | { kind: 'parsed'; parsed: ParsedEarnings }
  | { kind: 'cancelled' }
  /** No OCR on this phone (iOS for now). */
  | { kind: 'unsupported' }
  /** ML Kit model still downloading through Google Play services. */
  | { kind: 'unavailable' }
  | { kind: 'failed' };

/**
 * Downscale before OCR: plenty for printed text on a phone screenshot, and
 * much lighter for low-memory phones than a full-resolution image.
 */
const PICK_OPTIONS = {
  mediaType: 'photo',
  selectionLimit: 1,
  maxWidth: 1080,
  maxHeight: 1920,
  quality: 0.9,
  includeBase64: false,
  includeExtra: false,
} as const;

export function isScreenshotReadingSupported(): boolean {
  return Boolean(NativeTextRecognizer);
}

export async function readScreenshot(today: ISODate): Promise<ReadScreenshotResult> {
  if (!NativeTextRecognizer) {
    return { kind: 'unsupported' };
  }

  const picked = await launchImageLibrary(PICK_OPTIONS);
  if (picked.didCancel) {
    return { kind: 'cancelled' };
  }
  const uri = picked.assets?.[0]?.uri;
  if (picked.errorCode || !uri) {
    return { kind: 'failed' };
  }

  try {
    const text = await NativeTextRecognizer.recognize(uri);
    return { kind: 'parsed', parsed: parseEarningsText(text, { today }) };
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    return { kind: code === 'unavailable' ? 'unavailable' : 'failed' };
  }
}
