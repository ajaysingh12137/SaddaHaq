import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { cardShadow } from '../theme/tokens';
import { OfflineBanner } from './OfflineBanner';

/**
 * Standard screen: offline banner, scrollable content, and a footer pinned to
 * the bottom for the primary action (easy to reach one-handed).
 */
export function Screen({
  children,
  footer,
  scroll = true,
  testID,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  testID?: string;
}) {
  const { colors, spacing } = useTheme();
  const content = { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.md };

  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      testID={testID}
    >
      <OfflineBanner />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, content]}>{children}</View>
        )}
        {footer ? (
          <View
            style={{
              padding: spacing.md,
              gap: spacing.xs,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: colors.surfaceRaised,
              ...cardShadow(colors.shadow, 2),
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
