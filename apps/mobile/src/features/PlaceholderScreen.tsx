import React from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '../components/EmptyState';
import { type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';

export function PlaceholderScreen({ title, icon }: { title: string; icon: IconName }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader title={title} />
      <EmptyState icon={icon} message={t('placeholder.comingSoon')} />
    </Screen>
  );
}
