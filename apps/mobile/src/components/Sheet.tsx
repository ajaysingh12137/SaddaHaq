import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

/**
 * Bottom sheet built on Modal (no gesture library): content scrolls, the
 * primary action sits in a footer within thumb reach. Back button closes it.
 */
export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  footer,
  children,
  testID,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.fill, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={styles.fill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('log.close')}
        />
        <View
          testID={testID}
          style={{
            maxHeight: '90%',
            backgroundColor: colors.background,
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
            paddingBottom: insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingLeft: spacing.md,
              paddingRight: spacing.xs,
              paddingTop: spacing.xs,
            }}
          >
            <View style={{ flex: 1, paddingVertical: spacing.xs }}>
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="body" tone="muted">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <IconButton icon="close" accessibilityLabel={t('log.close')} onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={{
                padding: spacing.md,
                gap: spacing.xs,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
