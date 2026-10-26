import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { type IconName } from '../../components/Icon';
import { IconCircle } from '../../components/IconCircle';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ToggleRow } from '../../components/ToggleRow';
import { type OnboardingStackParamList } from '../../navigation/types';
import { completeOnboarding } from '../../services/session';
import { useSession } from '../../state/sessionStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Consent'>;

const SECTIONS: Array<{ icon: IconName; title: string; body: string; good?: boolean }> = [
  { icon: 'phone', title: 'consent.storeTitle', body: 'consent.storeBody' },
  { icon: 'lock', title: 'consent.neverTitle', body: 'consent.neverBody', good: true },
  { icon: 'target', title: 'consent.whyTitle', body: 'consent.whyBody' },
  { icon: 'image', title: 'consent.screenshotTitle', body: 'consent.screenshotBody' },
  { icon: 'trash', title: 'consent.deleteTitle', body: 'consent.deleteBody' },
];

export function ConsentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const config = useSession(s => s.eligibilityConfig);
  // Both off unless the worker already chose otherwise on an earlier install.
  const previous = useSession(s => (s.user?.consents.acceptedAt ? s.user.consents : null));
  const [backup, setBackup] = useState(previous?.backup ?? false);
  const [analytics, setAnalytics] = useState(previous?.analytics ?? false);
  const [saving, setSaving] = useState(false);

  const values = { single: config.singleThreshold, multi: config.multiThreshold };
  const sections = SECTIONS.map(s => ({
    icon: s.icon,
    good: s.good === true,
    title: t(s.title as 'consent.storeTitle'),
    body: t(s.body as 'consent.storeBody', values),
  }));
  const script = [
    t('consent.title'),
    ...sections.map(s => `${s.title}. ${s.body}`),
    t('consent.estimateNote'),
  ].join(' ');

  const onAgree = async () => {
    setSaving(true);
    try {
      await completeOnboarding({ platforms: route.params.platforms, backup, analytics });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      testID="consent-screen"
      footer={
        <Button
          label={t('consent.agree')}
          icon="check"
          onPress={() => void onAgree()}
          loading={saving}
          testID="consent-agree"
        />
      }
    >
      <ScreenHeader
        title={t('consent.title')}
        onBack={navigation.goBack}
        backLabel={t('common.back')}
        icon="shield"
      />
      <ReadAloudButton text={script} testID="consent-read-aloud" />
      <Card style={{ gap: spacing.md }}>
        {sections.map(section => (
          <View key={section.title} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconCircle
              name={section.icon}
              size={40}
              color={section.good ? colors.good : colors.accent}
              background={section.good ? colors.goodSoft : colors.accentSoft}
            />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <AppText variant="body" weight="bold">
                {section.title}
              </AppText>
              <AppText variant="body" tone="muted">
                {section.body}
              </AppText>
            </View>
          </View>
        ))}
      </Card>
      <AppText variant="caption" tone="muted">
        {t('consent.estimateNote')}
      </AppText>
      <ToggleRow
        icon="cloud"
        title={t('consent.backupTitle')}
        body={t('consent.backupBody')}
        value={backup}
        onChange={setBackup}
        testID="consent-backup"
      />
      <ToggleRow
        icon="chart"
        title={t('consent.analyticsTitle')}
        body={t('consent.analyticsBody')}
        value={analytics}
        onChange={setAnalytics}
        testID="consent-analytics"
      />
    </Screen>
  );
}
