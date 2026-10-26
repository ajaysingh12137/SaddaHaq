import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorMessage } from '../../api/errors';
import { Button } from '../../components/Button';
import { InfoBanner } from '../../components/InfoBanner';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import { useOnline } from '../../hooks/useOnline';
import { type OnboardingStackParamList } from '../../navigation/types';
import { requestOtp, signIn } from '../../services/session';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Otp'>;

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      return;
    }
    const timer = setTimeout(() => setLeft(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return [left, setLeft] as const;
}

export function OtpScreen({ navigation, route }: Props) {
  const { phone, resendAfterSec, testCode } = route.params;
  const { t } = useTranslation();
  const online = useOnline();
  const [code, setCode] = useState('');
  const [left, setLeft] = useCountdown(resendAfterSec);

  // On success the session moves to "onboarding" and navigation follows automatically.
  const verify = useMutation({ mutationFn: (otp: string) => signIn(phone, otp) });
  const resend = useMutation({
    mutationFn: () => requestOtp(phone),
    onSuccess: result => {
      setCode('');
      verify.reset();
      setLeft(result.resendAfterSec);
    },
  });

  const onChange = (value: string) => {
    const digits = value.replace(/[^\d]/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !verify.isPending) {
      verify.mutate(digits);
    }
  };

  const failure = verify.error ?? resend.error;
  const message = failure ? errorMessage(failure) : null;

  return (
    <Screen
      testID="otp-screen"
      footer={
        <>
          <Button
            label={t('otp.verify')}
            icon="check"
            onPress={() => verify.mutate(code)}
            loading={verify.isPending}
            disabled={code.length !== 6 || !online}
            testID="otp-verify"
          />
          <Button
            variant="ghost"
            label={left > 0 ? t('otp.resendIn', { seconds: left }) : t('otp.resend')}
            onPress={() => resend.mutate()}
            disabled={left > 0 || resend.isPending || !online}
            testID="otp-resend"
          />
        </>
      }
    >
      <ScreenHeader
        title={t('otp.title')}
        subtitle={t('otp.subtitle', { phone })}
        onBack={navigation.goBack}
        backLabel={t('otp.changeNumber')}
        icon="phoneMessage"
      />
      <TextField
        label={t('otp.label')}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus
        error={message ? t(message.key, 'values' in message ? message.values : {}) : null}
        testID="otp-input"
      />
      {testCode ? (
        <>
          <InfoBanner message={t('otp.testMode', { code: testCode })} testID="otp-test-mode" />
          <Button
            variant="secondary"
            label={t('otp.useTestCode')}
            onPress={() => onChange(testCode)}
            testID="otp-use-test-code"
          />
        </>
      ) : null}
    </Screen>
  );
}
