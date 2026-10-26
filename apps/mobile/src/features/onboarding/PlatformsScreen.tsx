import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PLATFORM_IDS, type PlatformId } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { PlatformGrid } from '../../components/PlatformGrid';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { type OnboardingStackParamList } from '../../navigation/types';
import { useSession } from '../../state/sessionStore';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Platforms'>;

export function PlatformsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  // A returning worker sees their saved apps already ticked.
  const saved = useSession(s => s.user?.platforms ?? []);
  const [selected, setSelected] = useState<PlatformId[]>(saved);
  const [tried, setTried] = useState(false);

  const toggle = (id: PlatformId) =>
    setSelected(list => (list.includes(id) ? list.filter(p => p !== id) : [...list, id]));

  const onContinue = () => {
    setTried(true);
    if (selected.length > 0) {
      // Keep the canonical order regardless of tap order.
      navigation.navigate('Consent', {
        platforms: PLATFORM_IDS.filter(id => selected.includes(id)),
      });
    }
  };

  return (
    <Screen
      testID="platforms-screen"
      footer={
        <>
          {tried && selected.length === 0 ? (
            <AppText variant="caption" tone="danger" center accessibilityLiveRegion="polite">
              {t('platforms.pickOne')}
            </AppText>
          ) : null}
          <Button
            label={t('common.continue')}
            icon="arrowRight"
            onPress={onContinue}
            testID="platforms-continue"
          />
        </>
      }
    >
      <ScreenHeader title={t('platforms.title')} subtitle={t('platforms.subtitle')} icon="worker" />
      <PlatformGrid ids={PLATFORM_IDS} selected={selected} onToggle={toggle} />
    </Screen>
  );
}
