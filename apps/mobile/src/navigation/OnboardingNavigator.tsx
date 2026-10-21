import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ConsentScreen } from '../features/onboarding/ConsentScreen';
import { LanguageScreen } from '../features/onboarding/LanguageScreen';
import { OtpScreen } from '../features/onboarding/OtpScreen';
import { PhoneScreen } from '../features/onboarding/PhoneScreen';
import { PlatformsScreen } from '../features/onboarding/PlatformsScreen';
import { useSession } from '../state/sessionStore';
import { type OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  const status = useSession(s => s.status);
  const languageChosen = useSession(s => s.languageChosen);

  const initialRouteName: keyof OnboardingStackParamList = !languageChosen
    ? 'Language'
    : status === 'onboarding'
      ? 'Platforms'
      : 'Phone';

  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Language" component={LanguageScreen} />
      {status === 'signedOut' ? (
        <>
          <Stack.Screen name="Phone" component={PhoneScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Platforms" component={PlatformsScreen} />
          <Stack.Screen name="Consent" component={ConsentScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
