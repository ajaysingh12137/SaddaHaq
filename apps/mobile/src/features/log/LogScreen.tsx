import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '../PlaceholderScreen';

/** Built in Phase 4. */
export function LogScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('tabs.log')} icon="calendar" />;
}
