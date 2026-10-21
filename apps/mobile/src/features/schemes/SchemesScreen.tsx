import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { type Scheme } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { InfoBanner } from '../../components/InfoBanner';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useLocalized } from '../../hooks/useLanguage';
import { formatDate } from '../../lib/dates';
import { type MainStackParamList } from '../../navigation/types';
import { useContent } from '../../services/content';
import { useTheme } from '../../theme/ThemeProvider';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

function SchemeCard({ scheme, onPress }: { scheme: Scheme; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const localized = useLocalized();
  const name = localized(scheme.name);
  const covers = localized(scheme.covers);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('schemes.a11yCard', { name, covers })}
      testID={`scheme-${scheme.id}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.sm,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surface : colors.surfaceRaised,
      })}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="bodyLarge" weight="bold">
          {name}
        </AppText>
        <AppText variant="body" tone="muted" numberOfLines={2}>
          {covers}
        </AppText>
        <AppText variant="caption" tone={scheme.placeholder ? 'warning' : 'muted'}>
          {scheme.placeholder
            ? t('schemes.placeholderBadge')
            : t('schemes.lastVerified', { date: formatDate(scheme.lastVerified, t) })}
        </AppText>
      </View>
      <View style={{ justifyContent: 'center' }}>
        <Icon name="chevronRight" color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export function SchemesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { spacing } = useTheme();
  const { schemes } = useContent();

  return (
    <Screen scroll={false} testID="schemes-screen">
      <View style={{ flex: 1 }}>
        <FlashList
          data={schemes}
          keyExtractor={scheme => scheme.id}
          ListHeaderComponent={
            <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
              <ScreenHeader title={t('schemes.title')} subtitle={t('schemes.subtitle')} />
              {schemes.some(s => s.placeholder) ? (
                <InfoBanner tone="warning" message={t('schemes.placeholderNote')} />
              ) : null}
              <InfoBanner message={t('schemes.eshramFirst')} icon="idCard" />
              <Button
                variant="secondary"
                icon="idCard"
                label={t('eshram.open')}
                onPress={() => navigation.navigate('EshramGuide')}
                testID="schemes-open-eshram"
              />
            </View>
          }
          renderItem={({ item }) => (
            <SchemeCard
              scheme={item}
              onPress={() => navigation.navigate('SchemeDetail', { id: item.id })}
            />
          )}
        />
      </View>
    </Screen>
  );
}
