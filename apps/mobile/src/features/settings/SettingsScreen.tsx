import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share, View } from 'react-native';

import { type Language } from '@saddahaq/shared';

import { ApiError } from '../../api/errors';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon, type IconName } from '../../components/Icon';
import { ChoiceGroup } from '../../components/ChoiceGroup';
import { InfoBanner } from '../../components/InfoBanner';
import { usePlatformName } from '../../components/PlatformTile';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ToggleRow } from '../../components/ToggleRow';
import { APP_VERSION } from '../../config/version';
import { logsToCsv } from '../../lib/csv';
import { compareVersions, useContent } from '../../services/content';
import { chooseLanguage, deleteAccount, setConsents, setSpeechRate } from '../../services/session';
import { useLogs } from '../../state/logsStore';
import { useSession } from '../../state/sessionStore';
import { useTheme } from '../../theme/ThemeProvider';

const SPEEDS = [
  { value: 0.8, label: 'settings.speedSlow' },
  { value: 1, label: 'settings.speedNormal' },
  { value: 1.25, label: 'settings.speedFast' },
] as const;

function SectionTitle({ children, icon }: { children: string; icon: IconName }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 8 }}>
      <Icon name={icon} size={22} color={colors.accent} />
      <AppText variant="title" accessibilityRole="header" style={{ flex: 1 }}>
        {children}
      </AppText>
    </View>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const platformName = usePlatformName();
  const language = useSession(s => s.language);
  const speechRate = useSession(s => s.speechRate);
  const consents = useSession(s => s.user?.consents);
  const logs = useLogs(s => s.logs);
  const { appConfig } = useContent();

  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const backup = consents?.backup ?? false;
  const analytics = consents?.analytics ?? false;
  const updateNeeded = compareVersions(APP_VERSION, appConfig.minAppVersion) < 0;

  const onBackupChange = (value: boolean) => {
    if (value) {
      void setConsents({ backup: true, analytics });
      return;
    }
    Alert.alert(t('settings.backupOffTitle'), t('settings.backupOffBody'), [
      { text: t('settings.cancel'), style: 'cancel' },
      {
        text: t('settings.backupOffConfirm'),
        style: 'destructive',
        onPress: () => void setConsents({ backup: false, analytics }),
      },
    ]);
  };

  const onExport = async () => {
    setNotice(null);
    if (logs.length === 0) {
      setNotice(t('settings.exportEmpty'));
      return;
    }
    try {
      await Share.share({
        title: t('settings.exportTitle'),
        message: logsToCsv(logs, platformName),
      });
    } catch {
      setNotice(t('settings.exportFailed'));
    }
  };

  const runDelete = async () => {
    setNotice(null);
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (error) {
      setDeleting(false);
      setNotice(
        error instanceof ApiError && error.isNetwork
          ? t('settings.deleteNeedsInternet')
          : t('settings.deleteFailed'),
      );
    }
  };

  const onDelete = () =>
    Alert.alert(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmBody'), [
      { text: t('settings.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteConfirm'),
        style: 'destructive',
        onPress: () => void runDelete(),
      },
    ]);

  return (
    <Screen testID="settings-screen">
      <ScreenHeader title={t('settings.title')} />
      {updateNeeded ? <InfoBanner tone="warning" message={t('settings.updateNeeded')} /> : null}
      {notice ? (
        <AppText
          variant="body"
          tone="warning"
          accessibilityLiveRegion="polite"
          testID="settings-notice"
        >
          {notice}
        </AppText>
      ) : null}

      <SectionTitle icon="globe">{t('settings.languageVoiceTitle')}</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <ChoiceGroup<Language>
          label={t('settings.language')}
          choices={[
            { value: 'hi', label: t('language.hi') },
            { value: 'en', label: t('language.en') },
          ]}
          value={language}
          onChange={value => void chooseLanguage(value)}
          testIDPrefix="settings-language"
        />

        <ChoiceGroup<number>
          label={t('settings.speechTitle')}
          choices={SPEEDS.map(s => ({ value: s.value, label: t(s.label) }))}
          value={speechRate}
          onChange={value => void setSpeechRate(value)}
          testIDPrefix="settings-speed"
        />
        <ReadAloudButton text={t('settings.speechSample')} />
      </Card>

      <SectionTitle icon="lock">{t('settings.privacyTitle')}</SectionTitle>
      <ToggleRow
        icon="cloud"
        title={t('consent.backupTitle')}
        body={t('consent.backupBody')}
        value={backup}
        onChange={onBackupChange}
        testID="settings-backup"
      />
      <ToggleRow
        icon="chart"
        title={t('consent.analyticsTitle')}
        body={t('consent.analyticsBody')}
        value={analytics}
        onChange={value => void setConsents({ backup, analytics: value })}
        testID="settings-analytics"
      />

      <SectionTitle icon="fileText">{t('settings.exportTitle')}</SectionTitle>
      <Card>
        <AppText variant="body" tone="muted">
          {t('settings.exportBody')}
        </AppText>
        <Button
          variant="secondary"
          icon="download"
          label={t('settings.export')}
          onPress={() => void onExport()}
          testID="settings-export"
        />
      </Card>

      <SectionTitle icon="trash">{t('settings.deleteTitle')}</SectionTitle>
      <Card>
        <AppText variant="body" tone="muted">
          {t('settings.deleteBody')}
        </AppText>
        <Button
          variant="danger"
          icon="trash"
          label={t('settings.delete')}
          onPress={onDelete}
          loading={deleting}
          testID="settings-delete"
        />
      </Card>

      <View style={{ paddingVertical: spacing.md }}>
        <AppText variant="caption" tone="muted" center testID="settings-version">
          {t('settings.version', { version: APP_VERSION })}
        </AppText>
      </View>
    </Screen>
  );
}
