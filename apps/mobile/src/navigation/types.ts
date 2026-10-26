import { type PlatformId } from '@saddahaq/shared';

export type OnboardingStackParamList = {
  Language: undefined;
  Phone: undefined;
  /** testCode: set only when the server runs the fixed test login. */
  Otp: { phone: string; resendAfterSec: number; testCode?: string };
  Platforms: undefined;
  Consent: { platforms: PlatformId[] };
};

export type MainTabParamList = {
  Home: undefined;
  Log: undefined;
  Schemes: undefined;
  Settings: undefined;
};

/** Full-screen pages opened above the tabs. */
export type MainStackParamList = {
  Tabs: undefined;
  EshramGuide: undefined;
  SchemeDetail: { id: string };
};
