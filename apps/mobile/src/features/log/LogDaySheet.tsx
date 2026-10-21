import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type ISODate, PLATFORM_IDS, type PlatformId } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { PlatformGrid } from '../../components/PlatformGrid';
import { usePlatformName } from '../../components/PlatformTile';
import { Sheet } from '../../components/Sheet';
import { formatDate } from '../../lib/dates';
import { logDay, useLogs } from '../../state/logsStore';
import { useSession } from '../../state/sessionStore';

/**
 * Quick log: tick the apps worked on one date. Saving with nothing ticked
 * clears the day. `date === null` hides the sheet.
 */
export function LogDaySheet({ date, onClose }: { date: ISODate | null; onClose: () => void }) {
  const { t } = useTranslation();
  const platformName = usePlatformName();
  const myPlatforms = useSession(s => s.user?.platforms ?? []);
  const allLogs = useLogs(s => s.logs);
  const dayLogs = useMemo(() => allLogs.filter(l => l.date === date), [allLogs, date]);

  const [selected, setSelected] = useState<PlatformId[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);

  // Start from what is already logged each time the sheet opens on a date.
  useEffect(() => {
    if (date) {
      setSelected(dayLogs.map(l => l.platform));
      setShowAll(false);
    }
    // Only when the date changes, not on every store update while editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const visible = useMemo(() => {
    const preferred = new Set<PlatformId>([...myPlatforms, ...dayLogs.map(l => l.platform)]);
    return showAll || preferred.size === 0
      ? PLATFORM_IDS
      : PLATFORM_IDS.filter(id => preferred.has(id));
  }, [myPlatforms, dayLogs, showAll]);

  const toggle = (id: PlatformId) =>
    setSelected(list => (list.includes(id) ? list.filter(p => p !== id) : [...list, id]));

  const save = async (platforms: PlatformId[]) => {
    if (!date) return;
    setSaving(true);
    try {
      await logDay(date, platforms);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const withAmounts = dayLogs.filter(l => l.amount !== null);

  return (
    <Sheet
      visible={date !== null}
      title={t('log.sheetTitle')}
      subtitle={date ? formatDate(date, t) : undefined}
      onClose={onClose}
      testID="log-day-sheet"
      footer={
        <>
          <Button
            label={t('log.save')}
            icon="check"
            onPress={() => void save(selected)}
            loading={saving}
            testID="log-day-save"
          />
          {dayLogs.length > 0 ? (
            <Button
              variant="ghost"
              icon="trash"
              label={t('log.clearDay')}
              onPress={() => void save([])}
              disabled={saving}
              testID="log-day-clear"
            />
          ) : null}
        </>
      }
    >
      <PlatformGrid
        ids={visible}
        selected={selected}
        onToggle={toggle}
        testIDPrefix="log-platform"
      />
      {visible.length < PLATFORM_IDS.length ? (
        <Button
          variant="secondary"
          icon="plus"
          label={t('log.moreApps')}
          onPress={() => setShowAll(true)}
          testID="log-day-more"
        />
      ) : null}
      {withAmounts.map(l => (
        <AppText key={l.id} variant="caption" tone="muted">
          {t('log.amountFromScreenshot', { platform: platformName(l.platform), amount: l.amount })}
        </AppText>
      ))}
    </Sheet>
  );
}
