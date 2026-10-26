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
import { Card } from '../../components/Card';
import { Icon, type IconName } from '../../components/Icon';
import { IconCircle } from '../../components/IconCircle';
import { InfoBanner } from '../../components/InfoBanner';
import { PlatformBadge, usePlatformName } from '../../components/PlatformTile';
import { ProgressRing } from '../../components/ProgressRing';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { Screen } from '../../components/Screen';
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
    <Card style={{ gap: spacing.md }}>
      <AppText variant="title">{t('home.perPlatformTitle')}</AppText>
      {entries.map(([id, days]) => (
        <View
          key={id}
          accessible
          accessibilityLabel={t('home.barA11y', { platform: platformName(id), days })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          testID={`bar-${id}`}
        >
          <PlatformBadge id={id} size={40} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="body" weight="bold">
                {platformName(id)}
              </AppText>
              <AppText variant="body" tone="muted">
                {days}/{target}
              </AppText>
            </View>
            <View style={{ height: 10, borderRadius: radii.pill, backgroundColor: colors.track }}>
              <View
                style={{
                  width: `${Math.max(4, Math.min(100, (days / target) * 100))}%`,
                  height: 10,
                  borderRadius: radii.pill,
                  backgroundColor: PLATFORMS[id].color,
                }}
              />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

/** A small figure with its label: "all apps together" and "days left". */
function StatTile({ icon, text, testID }: { icon: IconName; text: string; testID: string }) {
  const { spacing } = useTheme();
  return (
    <Card style={{ flex: 1, gap: spacing.xs }}>
      <IconCircle name={icon} size={40} />
      <AppText variant="body" weight="bold" testID={testID}>
        {text}
      </AppText>
    </Card>
  );
}

/** Shown until the worker says they are registered: e-Shram is the first step to any benefit. */
function EshramCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  return (
    <Card testID="home-eshram-card">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconCircle
          name="idCard"
          size={48}
          color={colors.warning}
          background={colors.warningSoft}
        />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="bodyLarge" weight="bold">
            {t('eshram.cardTitle')}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t('eshram.cardBody')}
          </AppText>
        </View>
      </View>
      <Button
        variant="secondary"
        icon="arrowRight"
        label={t('eshram.open')}
        onPress={onOpen}
        testID="home-open-eshram"
      />
    </Card>
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
  const heroColor = likely ? colors.good : colors.accent;
  const onHero = likely ? colors.onGood : colors.onAccent;

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
      <View style={{ gap: spacing.xxs, paddingTop: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name="wave" size={22} color={colors.warning} />
          <AppText variant="body" tone="muted">
            {t('home.greeting')}
          </AppText>
        </View>
        <AppText variant="heading">{t('home.title')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('home.fyLabel', { label: result.fy.label })}
        </AppText>
      </View>
      {updateNeeded ? <InfoBanner tone="warning" message={t('settings.updateNeeded')} /> : null}

      {result.status === 'no_logs' ? (
        <Card>
          <EmptyState icon="calendarPlus" message={t('home.empty')} />
        </Card>
      ) : (
        <>
          <Card
            tone="accent"
            style={{
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.lg,
              backgroundColor: heroColor,
            }}
          >
            <ProgressRing
              progress={primary.progress}
              size={200}
              color={onHero}
              trackColor="rgba(255, 255, 255, 0.25)"
              accessibilityLabel={t('home.ringA11y', {
                days: primary.days,
                target: primary.target,
                label: ringLabel,
              })}
            >
              <AppText variant="display" color={onHero} testID="meter-count">
                {primary.days}/{primary.target}
              </AppText>
              <AppText variant="caption" center color={onHero} style={{ maxWidth: 140 }}>
                {ringLabel}
              </AppText>
            </ProgressRing>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radii.pill,
                backgroundColor: colors.surfaceRaised,
              }}
            >
              <Icon
                name={likely ? 'checkCircle' : 'target'}
                filled={likely}
                size={20}
                color={likely ? colors.good : colors.accent}
              />
              <AppText
                variant="body"
                weight="bold"
                center
                color={likely ? colors.good : colors.onAccentSoft}
                testID="meter-status"
                accessibilityLiveRegion="polite"
                style={{ flexShrink: 1 }}
              >
                {status}
              </AppText>
            </View>
          </Card>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatTile icon="chart" text={secondary} testID="meter-secondary" />
            <StatTile icon="clock" text={daysLeft} testID="meter-days-left" />
          </View>
          <ReadAloudButton text={script} testID="home-read-aloud" />
        </>
      )}

      {registered ? null : <EshramCard onOpen={() => navigation.navigate('EshramGuide')} />}

      {result.status === 'no_logs' ? null : (
        <PlatformBars perPlatform={result.perPlatform} target={result.single.target} />
      )}

      <Card tone="soft" style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
          <Icon name="info" size={20} color={colors.onAccentSoft} />
          <AppText variant="caption" weight="bold" color={colors.onAccentSoft} style={{ flex: 1 }}>
            {t('home.rule', { single: config.singleThreshold, multi: config.multiThreshold })}
          </AppText>
        </View>
        <AppText variant="caption" color={colors.onAccentSoft} testID="meter-record-note">
          {t('home.recordNote')}
        </AppText>
      </Card>

      <LogDaySheet date={logToday ? today : null} onClose={() => setLogToday(false)} />
    </Screen>
  );
}
