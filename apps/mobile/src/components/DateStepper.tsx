import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { type ISODate, addDays } from '@saddahaq/shared';

import { formatDate } from '../lib/dates';
import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconButton } from './IconButton';

/**
 * Pick a date one day at a time, with a "Today" shortcut. No calendar widget:
 * screenshots are almost always from the last few days. Never past `max`.
 */
export function DateStepper({
  label,
  value,
  max,
  onChange,
  placeholder,
  testID,
}: {
  label: string;
  value: ISODate | null;
  max: ISODate;
  onChange: (date: ISODate) => void;
  placeholder: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const base = value ?? max;

  return (
    <View style={{ gap: spacing.xs }} testID={testID}>
      <AppText variant="body" weight="bold">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: TOUCH_TARGET + 8,
          borderWidth: 2,
          borderColor: value ? colors.border : colors.warning,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceRaised,
        }}
      >
        <IconButton
          icon="chevronLeft"
          accessibilityLabel={t('ocr.prevDay')}
          onPress={() => onChange(addDays(base, -1))}
          testID={testID ? `${testID}-prev` : undefined}
        />
        <AppText
          variant="bodyLarge"
          weight="bold"
          center
          style={{ flex: 1 }}
          tone={value ? 'default' : 'warning'}
          accessibilityLiveRegion="polite"
        >
          {value ? formatDate(value, t) : placeholder}
        </AppText>
        {base < max || value === null ? (
          <IconButton
            icon="chevronRight"
            accessibilityLabel={t('ocr.nextDay')}
            onPress={() => onChange(value === null ? max : addDays(base, 1))}
            testID={testID ? `${testID}-next` : undefined}
          />
        ) : (
          <View style={{ width: TOUCH_TARGET }} />
        )}
      </View>
      {value !== max ? (
        <Button
          variant="ghost"
          icon="calendar"
          label={t('log.today')}
          onPress={() => onChange(max)}
        />
      ) : null}
    </View>
  );
}
