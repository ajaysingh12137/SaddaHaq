import { useNetInfo } from '@react-native-community/netinfo';

/** Treats "unknown" as online so the UI never blocks on a slow first check. */
export function useOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo();
  return isConnected !== false && isInternetReachable !== false;
}
