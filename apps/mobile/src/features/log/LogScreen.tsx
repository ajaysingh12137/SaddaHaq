import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { type ISODate, type ParsedEarnings, financialYearOf, parseISODate } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useToday } from '../../hooks/useToday';
import { type ReadScreenshotResult } from '../../ocr/readScreenshot';
import { platformsByDate, useLogs } from '../../state/logsStore';
import { useSession } from '../../state/sessionStore';
import { useTheme } from '../../theme/ThemeProvider';
import { LogDaySheet } from './LogDaySheet';
import { MonthCalendar } from './MonthCalendar';
import { ScreenshotConfirmSheet } from './ScreenshotConfirmSheet';

interface MonthItem {
  key: string;
  year: number;
  month: number;
}

/** Months of the financial year up to this month, newest first (today is at the top). */
function monthsSoFar(fyStart: ISODate, today: ISODate): MonthItem[] {
  const start = parseISODate(fyStart);
  const end = parseISODate(today);
  const items: MonthItem[] = [];
  let { year, month } = end;
  while (year > start.year || (year === start.year && month >= start.month)) {
    items.push({ key: `${year}-${month}`, year, month });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return items;
}

type Notice = Exclude<ReadScreenshotResult['kind'], 'parsed' | 'cancelled'> | 'updated';

export function LogScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const today = useToday();
  const fyStartMonth = useSession(s => s.eligibilityConfig.fyStartMonth);
  const logs = useLogs(s => s.logs);

  const fy = useMemo(() => financialYearOf(today, fyStartMonth), [today, fyStartMonth]);
  const months = useMemo(() => monthsSoFar(fy.start, today), [fy.start, today]);
  const byDate = useMemo(() => platformsByDate(logs), [logs]);
  const hasLogsThisYear = logs.some(l => l.date >= fy.start && l.date <= fy.end);

  const [dayToLog, setDayToLog] = useState<ISODate | null>(null);
  const [parsed, setParsed] = useState<ParsedEarnings | null>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const onPressDay = useCallback((date: ISODate) => setDayToLog(date), []);

  const fromScreenshot = async () => {
    setNotice(null);
    setReading(true);
    try {
      // Inline require: the OCR code is only evaluated on first use, keeping app start light.
      const { readScreenshot } =
        require('../../ocr/readScreenshot') as typeof import('../../ocr/readScreenshot');
      const result = await readScreenshot(today);
      if (result.kind === 'parsed') {
        setParsed(result.parsed);
      } else if (result.kind !== 'cancelled') {
        setNotice(result.kind);
      }
    } finally {
      setReading(false);
    }
  };

  return (
    <Screen
      scroll={false}
      testID="log-screen"
      footer={
        <>
          {notice ? (
            <AppText
              variant="caption"
              tone={notice === 'updated' ? 'good' : 'warning'}
              center
              accessibilityLiveRegion="polite"
              testID="log-notice"
            >
              {t(`ocr.${notice}`)}
            </AppText>
          ) : null}
          <Button
            label={t('log.logToday')}
            icon="plus"
            onPress={() => setDayToLog(today)}
            testID="log-today"
          />
          <Button
            variant="secondary"
            icon="image"
            label={reading ? t('ocr.reading') : t('log.fromScreenshot')}
            onPress={() => void fromScreenshot()}
            loading={reading}
            testID="log-screenshot"
          />
        </>
      }
    >
      <ScreenHeader title={t('log.title')} subtitle={t('log.subtitle')} />
      {/* Slightly wider than the screen padding so 7 day cells stay ≥ 48 dp on a 360 dp phone. */}
      <View style={{ flex: 1, marginHorizontal: -spacing.xs }}>
        <FlashList
          data={months}
          keyExtractor={item => item.key}
          extraData={byDate}
          ListHeaderComponent={
            hasLogsThisYear ? null : <EmptyState icon="calendar" message={t('home.empty')} />
          }
          renderItem={({ item }) => (
            <MonthCalendar
              year={item.year}
              month={item.month}
              today={today}
              minDate={fy.start}
              byDate={byDate}
              onPressDay={onPressDay}
            />
          )}
          contentContainerStyle={{ paddingBottom: spacing.md }}
        />
      </View>

      <LogDaySheet date={dayToLog} onClose={() => setDayToLog(null)} />
      <ScreenshotConfirmSheet
        parsed={parsed}
        today={today}
        onClose={() => setParsed(null)}
        onSaved={outcome => {
          setParsed(null);
          setNotice(outcome === 'updated' ? 'updated' : null);
        }}
      />
    </Screen>
  );
}
