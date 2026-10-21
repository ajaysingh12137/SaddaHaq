import { Linking } from 'react-native';

/** The official portal. The app only links to it; it never embeds or fills it. */
export const ESHRAM_URL = 'https://eshram.gov.in';

/** Opens a URL in the phone's browser or dialer. Resolves false if nothing could open it. */
export async function openExternal(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
