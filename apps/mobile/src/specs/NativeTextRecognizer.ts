import { type TurboModule, TurboModuleRegistry } from 'react-native';

/**
 * On-device text recognition (Google ML Kit, Latin + Devanagari), implemented
 * in android/app/src/main/java/com/saddahaq/ocr. Codegen reads this spec.
 */
export interface Spec extends TurboModule {
  /**
   * Resolves with the recognised text of the image at `uri`. If `uri` is a file
   * in the app's cache (the picker's resized copy), it is deleted afterwards.
   * Rejects with code "unavailable" while the ML Kit model is not downloaded yet.
   */
  recognize(uri: string): Promise<string>;
}

/** Null where the module does not exist (iOS, tests). */
export default TurboModuleRegistry.get<Spec>('TextRecognizer');
