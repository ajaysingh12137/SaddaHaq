import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  type EligibilityResult,
  PLATFORMS,
  type PlatformId,
  computeEligibility,
} from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { InfoBanner } from '../../components/InfoBanner';
import { PlatformBadge, usePlatformName } from '../../components/PlatformTile';
import { ProgressRing } from '../../components/ProgressRing';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { APP_VERSION } from '../../config/version';
import { useToday } from '../../hooks/useToday';
import { type MainStackParamList } from '../../navigation/types';
import { compareVersions, useContent } from '../../services/content';
import { useLogs } from '../../state/logsStore';
import { useSession } from '../../state/sessionStore';
import { useTheme } from '../../theme/ThemeProvider';
import { LogDaySheet } from '../log/LogDaySheet';

/** Builds the one-line status and the secondary path text. Never says "eligible" without "likely … by your records". */
function useMeterText(result: EligibilityResult) {
  const { t } = useTranslation();
  const platformName = usePlatformName();
  const best = result.single.platform ? platformName(result.single.platform as PlatformId) : '';
  const primaryIsSingle = result.primaryPath === 'single';
  const primary = primaryIsSingle ? result.single : result.multi;

  const status =
    result.status === 'likely_eligible'
      ? t('home.statusLikely')
      : result.status === 'fy_ended'
        ? t('home.statusEnded')
        : primaryIsSingle
          ? t('home.statusSingle', {
              remaining: primary.remaining,
              platform: best,
              target: primary.target,
            })
          : t('home.statusMulti', { remaining: primary.remaining, target: primary.target });

  const secondary = primaryIsSingle
    ? t('home.otherMulti', { days: result.multi.days, target: result.multi.target })
    : t('home.otherSingle', {
        platform: best,
        days: result.single.days,
        target: result.single.target,
      });

  const ringLabel = primaryIsSingle
    ? t('home.ringSingle', { platform: best })
    : t('home.ringMulti');

  return { status, secondary, ringLabel, primary };
}

function PlatformBars({
  perPlatform,
  target,
}: {
  perPlatform: Record<string, number>;
  target: number;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const platformName = usePlatformName();
  const entries = (Object.entries(perPlatform) as Array<[PlatformId, number]>).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="title">{t('home.perPlatformTitle')}</AppText>
      {entries.map(([id, days]) => (
        <View
          key={id}
          accessible
          accessibilityLabel={t('home.barA11y', { platform: platformName(id), days })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          testID={`bar-${id}`}
        >
          <PlatformBadge id={id} size={36} />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="body" weight="bold">
                {platformName(id)}
              </AppText>
              <AppText variant="body">
                {days}/{target}
              </AppText>
            </View>
            <View style={{ height: 10, borderRadius: radii.pill, backgroundColor: colors.track }}>
              <View
                style={{
                  width: `${Math.min(100, (days / target) * 100)}%`,
                  height: 10,
                  borderRadius: radii.pill,
                  backgroundColor: PLATFORMS[id].color,
                }}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Shown until the worker says they are registered: e-Shram is the first step to any benefit. */
function EshramCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      testID="home-eshram-card"
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.accentSoft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name="idCard" color={colors.onAccentSoft} />
        <AppText variant="bodyLarge" weight="bold" color={colors.onAccentSoft} style={{ flex: 1 }}>
          {t('eshram.cardTitle')}
        </AppText>
      </View>
      <AppText variant="body" color={colors.onAccentSoft}>
        {t('eshram.cardBody')}
      </AppText>
      <Button
        variant="ghost"
        icon="arrowRight"
        label={t('eshram.open')}
        onPress={onOpen}
        testID="home-open-eshram"
      />
    </View>
  );
}

export function HomeScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const today = useToday();
  const config = useSession(s => s.eligibilityConfig);
  const logs = useLogs(s => s.logs);
  const [logToday, setLogToday] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const registered = useSession(s => s.user?.eshramRegistered ?? false);
  const { appConfig } = useContent();
  const updateNeeded = compareVersions(APP_VERSION, appConfig.minAppVersion) < 0;

  const result = useMemo(() => computeEligibility(logs, config, { today }), [logs, config, today]);
  const { status, secondary, ringLabel, primary } = useMeterText(result);
  const daysLeft = t('home.daysLeft', { count: result.daysLeftInFy });
  const likely = result.likelyEligible;

  const script = [
    status,
    `${primary.days} / ${primary.target} ${ringLabel}`,
    secondary,
    daysLeft,
    t('home.recordNote'),
  ].join('. ');

  return (
    <Screen
      testID="home-screen"
      footer={
        <Button
          label={t('home.logToday')}
          icon="plus"
          onPress={() => setLogToday(true)}
          testID="home-log-today"
        />
      }
    >
      <ScreenHeader
        title={t('home.title')}
        subtitle={t('home.fyLabel', { label: result.fy.label })}
      />
      {updateNeeded ? <InfoBanner tone="warning" message={t('settings.updateNeeded')} /> : null}
      {registered ? null : <EshramCard onOpen={() => navigation.navigate('EshramGuide')} />}

      {result.status === 'no_logs' ? (
        <EmptyState icon="calendar" message={t('home.empty')} />
      ) : (
        <>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <ProgressRing
              progress={primary.progress}
              color={likely ? colors.good : colors.accent}
              accessibilityLabel={t('home.ringA11y', {
                days: primary.days,
                target: primary.target,
                label: ringLabel,
              })}
            >
              <AppText variant="display" testID="meter-count">
                {primary.days}/{primary.target}
              </AppText>
              <AppText variant="caption" tone="muted" center style={{ maxWidth: 150 }}>
                {ringLabel}
              </AppText>
            </ProgressRing>
            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radii.md,
                backgroundColor: likely ? colors.good : colors.accentSoft,
              }}
            >
              <AppText
                variant="bodyLarge"
                weight="bold"
                center
                color={likely ? colors.onGood : colors.onAccentSoft}
                testID="meter-status"
                accessibilityLiveRegion="polite"
              >
                {status}
              </AppText>
            </View>
            <AppText variant="body" tone="muted" center testID="meter-secondary">
              {secondary}
            </AppText>
            <AppText variant="body" center testID="meter-days-left">
              {daysLeft}
            </AppText>
          </View>
          <ReadAloudButton text={script} testID="home-read-aloud" />
          <PlatformBars perPlatform={result.perPlatform} target={result.single.target} />
        </>
      )}

      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" tone="muted">
          {t('home.rule', { single: config.singleThreshold, multi: config.multiThreshold })}
        </AppText>
        <AppText variant="caption" tone="muted" testID="meter-record-note">
          {t('home.recordNote')}
        </AppText>
      </View>

      <LogDaySheet date={logToday ? today : null} onClose={() => setLogToday(false)} />
    </Screen>
  );
}
