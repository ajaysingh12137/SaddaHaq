import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { type Scheme } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon, type IconName } from '../../components/Icon';
import { IconCircle } from '../../components/IconCircle';
import { InfoBanner } from '../../components/InfoBanner';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useLocalized } from '../../hooks/useLanguage';
import { formatDate } from '../../lib/dates';
import { type MainStackParamList } from '../../navigation/types';
import { useContent } from '../../services/content';
import { useTheme } from '../../theme/ThemeProvider';
import { cardShadow } from '../../theme/tokens';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

/** A picture for each kind of benefit, matched from the scheme id (content has no icon field). */
function schemeIcon(id: string): IconName {
  if (id.includes('accident')) return 'accident';
  if (id.includes('life')) return 'life';
  if (id.includes('health')) return 'health';
  if (id.includes('maternity')) return 'maternity';
  if (id.includes('old-age') || id.includes('pension')) return 'oldAge';
  return 'gift';
}

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
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceRaised,
        opacity: pressed ? 0.88 : 1,
        ...cardShadow(colors.shadow),
      })}
    >
      <IconCircle name={schemeIcon(scheme.id)} size={52} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="bodyLarge" weight="bold">
          {name}
        </AppText>
        <AppText variant="body" tone="muted" numberOfLines={2}>
          {covers}
        </AppText>
        {scheme.placeholder ? (
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
              borderRadius: radii.pill,
              backgroundColor: colors.warningSoft,
            }}
          >
            <AppText variant="caption" weight="bold" color={colors.onWarningSoft}>
              {t('schemes.placeholderBadge')}
            </AppText>
          </View>
        ) : (
          <AppText variant="caption" tone="muted">
            {t('schemes.lastVerified', { date: formatDate(scheme.lastVerified, t) })}
          </AppText>
        )}
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
  const { colors, spacing } = useTheme();
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
              <Card tone="soft">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <IconCircle name="idCard" size={44} background={colors.surfaceRaised} />
                  <AppText
                    variant="body"
                    weight="bold"
                    color={colors.onAccentSoft}
                    style={{ flex: 1 }}
                  >
                    {t('schemes.eshramFirst')}
                  </AppText>
                </View>
                <Button
                  icon="arrowRight"
                  label={t('eshram.open')}
                  onPress={() => navigation.navigate('EshramGuide')}
                  testID="schemes-open-eshram"
                />
              </Card>
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
