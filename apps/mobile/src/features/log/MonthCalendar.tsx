import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { type ISODate, PLATFORMS, type PlatformId, daysInMonth, toISODate } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { usePlatformName } from '../../components/PlatformTile';
import { formatDate, formatMonth, weekdayOf, weekdayShort } from '../../lib/dates';
import { useTheme } from '../../theme/ThemeProvider';
import { cardShadow } from '../../theme/tokens';

const CELL_HEIGHT = 56;
const MAX_DOTS = 3;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export interface MonthCalendarProps {
  year: number;
  month: number;
  today: ISODate;
  /** Days before this (start of the financial year) are not shown as loggable. */
  minDate: ISODate;
  byDate: ReadonlyMap<ISODate, readonly PlatformId[]>;
  onPressDay: (date: ISODate) => void;
}

/** One month: weekday header, then a 7-column grid with a coloured dot per app logged. */
export const MonthCalendar = memo(function MonthCalendarView({
  year,
  month,
  today,
  minDate,
  byDate,
  onPressDay,
}: MonthCalendarProps) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const platformName = usePlatformName();

  const leading = weekdayOf(year, month, 1);
  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const daysLogged = cells.filter(
    day => day !== null && (byDate.get(toISODate(year, month, day))?.length ?? 0) > 0,
  ).length;

  return (
    // Card padding stays at 4 dp so seven day cells keep ≥ 48 dp on a 360 dp phone.
    <View
      style={{
        gap: spacing.xs,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xxs,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceRaised,
        ...cardShadow(colors.shadow),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.sm,
        }}
      >
        <AppText variant="title" accessibilityRole="header">
          {formatMonth(year, month, t)}
        </AppText>
        {daysLogged > 0 ? (
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xxs,
              borderRadius: radii.pill,
              backgroundColor: colors.accentSoft,
            }}
          >
            <AppText variant="caption" weight="bold" color={colors.onAccentSoft}>
              {t('log.monthCount', { count: daysLogged })}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map(d => (
          <AppText key={d} variant="caption" tone="muted" center style={{ flex: 1 }}>
            {weekdayShort(d, t)}
          </AppText>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {week.map((day, i) => {
            if (day === null) {
              return <View key={`blank-${i}`} style={{ flex: 1, height: CELL_HEIGHT }} />;
            }
            const date = toISODate(year, month, day);
            const platforms = byDate.get(date) ?? [];
            const isToday = date === today;
            const loggable = date <= today && date >= minDate;
            const label = !loggable
              ? t('log.dayA11yFuture', { date: formatDate(date, t) })
              : platforms.length > 0
                ? t('log.dayA11yLogged', {
                    date: formatDate(date, t),
                    platforms: platforms.map(platformName).join(', '),
                  })
                : t('log.dayA11yEmpty', { date: formatDate(date, t) });

            return (
              <Pressable
                key={date}
                disabled={!loggable}
                onPress={() => onPressDay(date)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: !loggable }}
                testID={`day-${date}`}
                style={({ pressed }) => ({
                  flex: 1,
                  height: CELL_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  borderRadius: radii.md,
                  borderWidth: isToday ? 2 : 0,
                  borderColor: colors.accent,
                  opacity: loggable ? 1 : 0.45,
                  backgroundColor:
                    platforms.length > 0 ? colors.accentSoft : pressed ? colors.surface : undefined,
                })}
              >
                <AppText
                  variant="body"
                  weight={platforms.length > 0 || isToday ? 'bold' : 'regular'}
                  color={
                    !loggable
                      ? colors.textMuted
                      : platforms.length > 0
                        ? colors.onAccentSoft
                        : colors.text
                  }
                  maxFontSizeMultiplier={1.3}
                >
                  {day}
                </AppText>
                <View style={{ flexDirection: 'row', gap: 2, height: 8 }}>
                  {platforms.slice(0, MAX_DOTS).map(p => (
                    <View
                      key={p}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: PLATFORMS[p].color,
                      }}
                    />
                  ))}
                  {platforms.length > MAX_DOTS ? (
                    <View
                      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text }}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
});
