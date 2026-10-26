import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { normalizeIndianMobile } from '@saddahaq/shared';

import { errorMessage } from '../../api/errors';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { InfoBanner } from '../../components/InfoBanner';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import { useOnline } from '../../hooks/useOnline';
import { type OnboardingStackParamList } from '../../navigation/types';
import { requestOtp } from '../../services/session';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Phone'>;

export function PhoneScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const online = useOnline();
  const [input, setInput] = useState('');
  const [touched, setTouched] = useState(false);

  const phone = normalizeIndianMobile(input);
  const send = useMutation({
    mutationFn: (value: string) => requestOtp(value),
    onSuccess: (result, value) =>
      navigation.navigate('Otp', {
        phone: value,
        resendAfterSec: result.resendAfterSec,
        testCode: result.testCode,
      }),
  });

  const fieldError = touched && !phone ? t('phone.invalid') : null;
  const apiError = send.error ? errorMessage(send.error) : null;

  const onSubmit = () => {
    setTouched(true);
    if (phone) {
      send.mutate(phone);
    }
  };

  return (
    <Screen
      testID="phone-screen"
      footer={
        <>
          {!online ? (
            <AppText variant="caption" tone="warning" center>
              {t('phone.needInternet')}
            </AppText>
          ) : null}
          <Button
            label={t('phone.send')}
            icon="arrowRight"
            onPress={onSubmit}
            loading={send.isPending}
            disabled={!online}
            testID="phone-send"
          />
        </>
      }
    >
      <ScreenHeader
        title={t('phone.title')}
        subtitle={t('phone.subtitle')}
        onBack={navigation.canGoBack() ? navigation.goBack : undefined}
        backLabel={t('common.back')}
        icon="phone"
      />
      <TextField
        label={t('phone.label')}
        prefix={t('phone.prefix')}
        value={input}
        onChangeText={value => setInput(value.replace(/[^\d]/g, '').slice(0, 10))}
        onBlur={() => setTouched(input.length > 0)}
        onSubmitEditing={onSubmit}
        keyboardType="phone-pad"
        autoComplete="tel-national"
        textContentType="telephoneNumber"
        maxLength={10}
        autoFocus
        returnKeyType="send"
        error={
          fieldError ??
          (apiError ? t(apiError.key, 'values' in apiError ? apiError.values : {}) : null)
        }
        testID="phone-input"
      />
      <InfoBanner tone="good" icon="lock" message={t('phone.privacy')} />
    </Screen>
  );
}
