import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '../PlaceholderScreen';

/** Built in Phase 5. */
export function SchemesScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('tabs.schemes')} icon="list" />;
}
