import { type PlatformId } from '@saddahaq/shared';

export type OnboardingStackParamList = {
  Language: undefined;
  Phone: undefined;
  Otp: { phone: string; resendAfterSec: number };
  Platforms: undefined;
  Consent: { platforms: PlatformId[] };
};

export type MainTabParamList = {
  Home: undefined;
  Log: undefined;
  Schemes: undefined;
  Settings: undefined;
};
