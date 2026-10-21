import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type ISODate, PLATFORM_IDS, type ParsedEarnings, type PlatformId } from '@saddahaq/shared';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { DateStepper } from '../../components/DateStepper';
import { PlatformGrid } from '../../components/PlatformGrid';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import { logFromScreenshot } from '../../state/logsStore';
import { useSession } from '../../state/sessionStore';

const MAX_AMOUNT = 1_000_000;

/** "1,234.50" → 1234.5; empty → null; anything else → undefined (invalid). */
export function parseAmountInput(value: string): number | null | undefined {
  const cleaned = value.replace(/[,\s₹]/g, '');
  if (cleaned === '') {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return undefined;
  }
  const amount = Number(cleaned);
  return amount <= MAX_AMOUNT ? amount : undefined;
}

type Problem = 'needPlatform' | 'needDate' | 'futureDate' | 'badAmount';

/**
 * Shows what OCR read from a screenshot so the worker can confirm or correct
 * every field before anything is saved. `parsed === null` hides the sheet.
 */
export function ScreenshotConfirmSheet({
  parsed,
  today,
  onClose,
  onSaved,
}: {
  parsed: ParsedEarnings | null;
  today: ISODate;
  onClose: () => void;
  onSaved: (outcome: 'created' | 'updated') => void;
}) {
  const { t } = useTranslation();
  const myPlatforms = useSession(s => s.user?.platforms ?? []);

  const [platform, setPlatform] = useState<PlatformId | null>(null);
  const [date, setDate] = useState<ISODate | null>(null);
  const [amount, setAmount] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (parsed) {
      setPlatform(parsed.platform);
      // A date read as later than today is an OCR mistake; let the worker choose.
      setDate(parsed.date !== null && parsed.date <= today ? parsed.date : null);
      setAmount(parsed.amount === null ? '' : String(parsed.amount));
      setShowAll(false);
      setProblem(null);
    }
  }, [parsed, today]);

  const visible = useMemo(() => {
    const preferred = new Set<PlatformId>(myPlatforms);
    if (platform) preferred.add(platform);
    return showAll || preferred.size === 0
      ? PLATFORM_IDS
      : PLATFORM_IDS.filter(id => preferred.has(id));
  }, [myPlatforms, platform, showAll]);

  const save = async () => {
    const value = parseAmountInput(amount);
    const found: Problem | null = !platform
      ? 'needPlatform'
      : !date
        ? 'needDate'
        : date > today
          ? 'futureDate'
          : value === undefined
            ? 'badAmount'
            : null;
    setProblem(found);
    if (found || !platform || !date || value === undefined) {
      return;
    }
    setSaving(true);
    try {
      onSaved(await logFromScreenshot({ date, platform, amount: value }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={parsed !== null}
      title={t('ocr.title')}
      subtitle={t('ocr.subtitle')}
      onClose={onClose}
      testID="ocr-sheet"
      footer={
        <>
          {problem ? (
            <AppText variant="caption" tone="danger" center accessibilityLiveRegion="polite">
              {t(`ocr.${problem}`)}
            </AppText>
          ) : null}
          <Button
            label={t('ocr.save')}
            icon="check"
            onPress={() => void save()}
            loading={saving}
            testID="ocr-save"
          />
        </>
      }
    >
      <AppText variant="body" weight="bold">
        {t('ocr.platform')}
      </AppText>
      <PlatformGrid
        ids={visible}
        selected={platform ? [platform] : []}
        onToggle={setPlatform}
        mode="single"
        testIDPrefix="ocr-platform"
      />
      {visible.length < PLATFORM_IDS.length ? (
        <Button
          variant="secondary"
          icon="plus"
          label={t('log.moreApps')}
          onPress={() => setShowAll(true)}
        />
      ) : null}
      <DateStepper
        label={t('ocr.date')}
        value={date}
        max={today}
        onChange={setDate}
        placeholder={t('ocr.dateMissing')}
        testID="ocr-date"
      />
      <TextField
        label={t('ocr.amount')}
        placeholder={t('ocr.amountHint')}
        prefix="₹"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        maxLength={12}
        testID="ocr-amount"
      />
      <AppText variant="caption" tone="muted">
        {t('ocr.privacy')}
      </AppText>
    </Sheet>
  );
}
