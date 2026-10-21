import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '../PlaceholderScreen';

/** Built in Phase 5. */
export function SettingsScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('tabs.settings')} icon="sliders" />;
}
