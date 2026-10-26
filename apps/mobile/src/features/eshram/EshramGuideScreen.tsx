import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CheckRow } from '../../components/CheckRow';
import { Icon, type IconName } from '../../components/Icon';
import { InfoBanner } from '../../components/InfoBanner';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ToggleRow } from '../../components/ToggleRow';
import { useLocalized } from '../../hooks/useLanguage';
import { formatDate } from '../../lib/dates';
import { ESHRAM_URL, openExternal } from '../../lib/links';
import { type MainStackParamList } from '../../navigation/types';
import { useContent } from '../../services/content';
import { setEshramRegistered } from '../../services/session';
import { useSession } from '../../state/sessionStore';
import { useTheme } from '../../theme/ThemeProvider';
import { CHECKLIST_ITEMS, useChecklist } from './checklist';

type Props = NativeStackScreenProps<MainStackParamList, 'EshramGuide'>;

/** Illustration placeholders: an icon per step until real artwork is drawn. */
const ILLUSTRATIONS: Record<string, IconName> = {
  documents: 'fileText',
  browser: 'globe',
  'phone-otp': 'phone',
  'id-card': 'idCard',
  form: 'list',
  bank: 'bank',
  card: 'download',
  check: 'check',
};

const CHECKLIST_LABELS = { mobile: 'eshram.checkMobile', bank: 'eshram.checkBank' } as const;

/**
 * Walks the worker through registering on the official portal. The app never
 * fills in or embeds the government form; it only opens it in the browser.
 */
export function EshramGuideScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const localized = useLocalized();
  const { eshramSteps } = useContent();
  const registered = useSession(s => s.user?.eshramRegistered ?? false);
  const { checklist, setItem } = useChecklist();
  const [index, setIndex] = useState(0);
  const [openFailed, setOpenFailed] = useState(false);

  const total = eshramSteps.length;
  const current = Math.min(index, Math.max(0, total - 1));
  const step = eshramSteps[current];
  const anyPlaceholder = eshramSteps.some(s => s.placeholder);
  const lastVerified = eshramSteps.map(s => s.lastVerified).sort()[0];

  const openPortal = async () => {
    setOpenFailed(!(await openExternal(ESHRAM_URL)));
  };

  return (
    <Screen
      testID="eshram-screen"
      footer={
        <>
          {openFailed ? (
            <AppText variant="caption" tone="danger" center accessibilityLiveRegion="polite">
              {t('eshram.openFailed')}
            </AppText>
          ) : null}
          <Button
            label={t('eshram.openPortal')}
            icon="external"
            onPress={() => void openPortal()}
            testID="eshram-open-portal"
          />
        </>
      }
    >
      <ScreenHeader
        title={t('eshram.title')}
        subtitle={t('eshram.subtitle')}
        onBack={navigation.goBack}
        backLabel={t('common.back')}
        icon="idCard"
      />
      {anyPlaceholder ? (
        <InfoBanner tone="warning" message={t('eshram.placeholder')} testID="eshram-placeholder" />
      ) : null}

      {step ? (
        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="caption" weight="bold" tone="accent" testID="eshram-step-count">
              {t('eshram.stepOf', { current: current + 1, total })}
            </AppText>
            {/* One segment per step: done steps filled, the rest on the track. */}
            <View
              style={{ flexDirection: 'row', gap: spacing.xxs }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {Array.from({ length: total }, (_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: radii.pill,
                    backgroundColor: i <= current ? colors.accent : colors.track,
                  }}
                />
              ))}
            </View>
          </View>
          <View
            style={{
              height: 140,
              borderRadius: radii.md,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={ILLUSTRATIONS[step.illustration] ?? 'info'}
              size={72}
              color={colors.onAccentSoft}
            />
          </View>
          <AppText variant="title" testID="eshram-step-title">
            {localized(step.title)}
          </AppText>
          <AppText variant="bodyLarge">{localized(step.body)}</AppText>
          <ReadAloudButton text={`${localized(step.title)}. ${localized(step.body)}`} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                icon="arrowLeft"
                label={t('eshram.prev')}
                onPress={() => setIndex(current - 1)}
                disabled={current === 0}
                testID="eshram-prev"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                icon="arrowRight"
                label={t('eshram.next')}
                onPress={() => setIndex(current + 1)}
                disabled={current >= total - 1}
                testID="eshram-next"
              />
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        <AppText variant="title">{t('eshram.checklistTitle')}</AppText>
        {CHECKLIST_ITEMS.map(item => (
          <CheckRow
            key={item}
            label={t(CHECKLIST_LABELS[item])}
            checked={checklist[item]}
            onChange={checked => setItem(item, checked)}
            testID={`eshram-check-${item}`}
          />
        ))}
      </Card>
      <InfoBanner message={t('eshram.privacy')} icon="shield" />
      <InfoBanner message={t('eshram.cscHelp')} />

      <ToggleRow
        icon="idCard"
        title={t('eshram.registeredTitle')}
        body={t('eshram.registeredBody')}
        value={registered}
        onChange={value => void setEshramRegistered(value)}
        testID="eshram-registered"
      />
      {lastVerified && !anyPlaceholder ? (
        <AppText variant="caption" tone="muted">
          {t('eshram.lastVerified', { date: formatDate(lastVerified, t) })}
        </AppText>
      ) : null}
    </Screen>
  );
}
