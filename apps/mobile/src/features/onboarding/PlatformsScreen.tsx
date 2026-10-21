import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PLATFORM_IDS, type PlatformId } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { PlatformTile } from '../../components/PlatformTile';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { type OnboardingStackParamList } from '../../navigation/types';
import { useSession } from '../../state/sessionStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Platforms'>;

/** Splits ids into rows of two for the tile grid. */
const rows = (ids: readonly PlatformId[]) =>
  ids.reduce<PlatformId[][]>((acc, id, i) => {
    if (i % 2 === 0) acc.push([id]);
    else acc[acc.length - 1]?.push(id);
    return acc;
  }, []);

export function PlatformsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
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
      <ScreenHeader title={t('platforms.title')} subtitle={t('platforms.subtitle')} />
      <View style={{ gap: spacing.sm }}>
        {rows(PLATFORM_IDS).map(row => (
          <View key={row.join('-')} style={{ flexDirection: 'row', gap: spacing.sm }}>
            {row.map(id => (
              <PlatformTile key={id} id={id} selected={selected.includes(id)} onToggle={toggle} />
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
