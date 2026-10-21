import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { openVoiceInstaller, useReadAloud } from '../speech/readAloud';
import { AppText } from './AppText';
import { Button } from './Button';

/** Reads `text` aloud with the phone's TTS; explains when no voice is installed. */
export function ReadAloudButton({ text, testID }: { text: string; testID?: string }) {
  const { t } = useTranslation();
  const { speaking, problem, toggle } = useReadAloud(text);

  return (
    <View style={{ gap: 8 }}>
      <Button
        variant="secondary"
        icon={speaking ? 'stop' : 'speaker'}
        label={speaking ? t('common.stopReading') : t('common.readAloud')}
        onPress={() => void toggle()}
        testID={testID}
      />
      {problem === 'no_voice' ? (
        <>
          <AppText variant="caption" tone="warning">
            {t('tts.noVoice')}
          </AppText>
          <Button
            variant="ghost"
            label={t('tts.installVoice')}
            onPress={() => void openVoiceInstaller()}
          />
        </>
      ) : null}
      {problem === 'error' ? (
        <AppText variant="caption" tone="warning">
          {t('tts.failed')}
        </AppText>
      ) : null}
    </View>
  );
}
