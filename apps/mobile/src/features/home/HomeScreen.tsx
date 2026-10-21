import React from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';

/** Eligibility meter arrives in Phase 4. */
export function HomeScreen() {
  const { t } = useTranslation();
  return (
    <Screen testID="home-screen">
      <ScreenHeader title={t('tabs.home')} />
      <EmptyState icon="calendar" message={t('home.empty')} />
    </Screen>
  );
}
