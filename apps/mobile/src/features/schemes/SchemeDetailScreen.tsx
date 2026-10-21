import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { InfoBanner } from '../../components/InfoBanner';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useLocalized } from '../../hooks/useLanguage';
import { formatDate } from '../../lib/dates';
import { openExternal } from '../../lib/links';
import { type MainStackParamList } from '../../navigation/types';
import { useContent } from '../../services/content';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'SchemeDetail'>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xxs }}>
      <AppText variant="body" weight="bold">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function SchemeDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { schemes } = useContent();
  const scheme = schemes.find(s => s.id === route.params.id);

  if (!scheme) {
    return (
      <Screen testID="scheme-detail-screen">
        <ScreenHeader
          title={t('schemes.title')}
          onBack={navigation.goBack}
          backLabel={t('common.back')}
        />
        <EmptyState icon="list" message={t('schemes.notFound')} />
      </Screen>
    );
  }

  const name = localized(scheme.name);
  const documents = localized(scheme.documents);
  const sections = [
    { title: t('schemes.covers'), body: localized(scheme.covers) },
    { title: t('schemes.whoQualifies'), body: localized(scheme.whoQualifies) },
    { title: t('schemes.whereToApply'), body: localized(scheme.whereToApply) },
  ];
  const script = [
    name,
    ...sections.map(s => `${s.title}. ${s.body}`),
    `${t('schemes.documents')}. ${documents.join(', ')}`,
  ].join(' ');
  const { helpline, url } = scheme;

  return (
    <Screen
      testID="scheme-detail-screen"
      footer={
        url ? (
          <Button
            label={t('schemes.openWebsite')}
            icon="external"
            onPress={() => void openExternal(url)}
            testID="scheme-open-website"
          />
        ) : undefined
      }
    >
      <ScreenHeader title={name} onBack={navigation.goBack} backLabel={t('common.back')} />
      {scheme.placeholder ? (
        <InfoBanner
          tone="warning"
          message={t('schemes.placeholderNote')}
          testID="scheme-placeholder"
        />
      ) : null}
      <ReadAloudButton text={script} testID="scheme-read-aloud" />
      {sections.map(section => (
        <Section key={section.title} title={section.title}>
          <AppText variant="body">{section.body}</AppText>
        </Section>
      ))}
      <Section title={t('schemes.documents')}>
        {documents.map(doc => (
          <AppText key={doc} variant="body">
            • {doc}
          </AppText>
        ))}
      </Section>
      <Section title={t('schemes.helpline')}>
        {helpline ? (
          <Button
            variant="secondary"
            icon="call"
            label={`${t('schemes.callHelpline')}: ${helpline}`}
            onPress={() => void openExternal(`tel:${helpline.replace(/[^\d+]/g, '')}`)}
            testID="scheme-call"
          />
        ) : (
          <AppText variant="body" tone="muted">
            {t('schemes.helplineMissing')}
          </AppText>
        )}
      </Section>
      <AppText variant="caption" tone="muted" testID="scheme-last-verified">
        {t('schemes.lastVerified', { date: formatDate(scheme.lastVerified, t) })}
      </AppText>
    </Screen>
  );
}
