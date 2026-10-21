import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { LANGUAGES, type Language } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { initI18n } from '../../i18n';
import { type OnboardingStackParamList } from '../../navigation/types';
import { chooseLanguage } from '../../services/session';
import { setSession, useSession } from '../../state/sessionStore';
import { useTheme } from '../../theme/ThemeProvider';
import { TOUCH_TARGET } from '../../theme/tokens';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Language'>;

export function LanguageScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const current = useSession(s => s.language);
  const status = useSession(s => s.status);
  const [saving, setSaving] = useState(false);

  // Switch the UI at once so the worker sees the language they tapped.
  const preview = async (language: Language) => {
    await initI18n(language);
    setSession({ language });
  };

  const onContinue = async () => {
    setSaving(true);
    try {
      await chooseLanguage(current);
      navigation.navigate(status === 'onboarding' ? 'Platforms' : 'Phone');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      testID="language-screen"
      footer={
        <Button
          label={t('common.continue')}
          icon="arrowRight"
          onPress={() => void onContinue()}
          loading={saving}
          testID="language-continue"
        />
      }
    >
      <ScreenHeader title={t('language.title')} subtitle={t('language.subtitle')} />
      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
        {LANGUAGES.map(language => {
          const selected = language === current;
          return (
            <Pressable
              key={language}
              onPress={() => void preview(language)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t('language.a11y', {
                language: t(`language.${language}`),
                state: selected ? t('common.selected') : t('common.notSelected'),
              })}
              testID={`language-${language}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: TOUCH_TARGET + 24,
                paddingHorizontal: spacing.lg,
                borderWidth: 2,
                borderRadius: radii.md,
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: selected ? colors.accentSoft : colors.surfaceRaised,
              }}
            >
              <Icon name="globe" color={selected ? colors.onAccentSoft : colors.textMuted} />
              <AppText
                variant="title"
                style={{ flex: 1 }}
                color={selected ? colors.onAccentSoft : colors.text}
              >
                {t(`language.${language}`)}
              </AppText>
              {selected ? <Icon name="check" color={colors.onAccentSoft} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
