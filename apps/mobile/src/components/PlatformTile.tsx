import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { PLATFORMS, type PlatformId } from '@saddahaq/shared';

import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Localised platform name; brand names stay as-is, "Other" is translated. */
export function usePlatformName() {
  const { t } = useTranslation();
  return (id: PlatformId) => (id === 'other' ? t('platforms.other') : PLATFORMS[id].name);
}

/** Neutral coloured initials — never real logos. */
export function PlatformBadge({ id, size = 44 }: { id: PlatformId; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PLATFORMS[id].color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="body" weight="bold" color="#FFFFFF" maxFontSizeMultiplier={1.3}>
        {PLATFORMS[id].initials}
      </AppText>
    </View>
  );
}

export function PlatformTile({
  id,
  selected,
  onToggle,
  role = 'checkbox',
  testID,
}: {
  id: PlatformId;
  selected: boolean;
  onToggle: (id: PlatformId) => void;
  role?: 'checkbox' | 'radio';
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const name = usePlatformName()(id);

  return (
    <Pressable
      onPress={() => onToggle(id)}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      accessibilityLabel={t('platforms.a11y', {
        name,
        state: selected ? t('common.selected') : t('common.notSelected'),
      })}
      testID={testID ?? `platform-${id}`}
      style={({ pressed }) => [
        styles.tile,
        {
          borderRadius: radii.md,
          padding: spacing.sm,
          gap: spacing.xs,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accentSoft : colors.surfaceRaised,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <PlatformBadge id={id} />
      <AppText
        variant="body"
        weight="bold"
        center
        numberOfLines={2}
        color={selected ? colors.onAccentSoft : colors.text}
      >
        {name}
      </AppText>
      {selected ? (
        <View style={[styles.check, { backgroundColor: colors.accent, borderRadius: radii.pill }]}>
          <Icon name="check" size={16} color={colors.onAccent} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
