import React from 'react';
import { View } from 'react-native';

import { type PlatformId } from '@saddahaq/shared';

import { useTheme } from '../theme/ThemeProvider';
import { PlatformTile } from './PlatformTile';

/** Splits ids into rows of two for the tile grid. */
const rows = (ids: readonly PlatformId[]) =>
  ids.reduce<PlatformId[][]>((acc, id, i) => {
    if (i % 2 === 0) acc.push([id]);
    else acc[acc.length - 1]?.push(id);
    return acc;
  }, []);

/** Two-column grid of platform tiles. `mode="single"` behaves like radio buttons. */
export function PlatformGrid({
  ids,
  selected,
  onToggle,
  mode = 'multi',
  testIDPrefix,
}: {
  ids: readonly PlatformId[];
  selected: readonly PlatformId[];
  onToggle: (id: PlatformId) => void;
  mode?: 'multi' | 'single';
  testIDPrefix?: string;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {rows(ids).map(row => (
        <View key={row.join('-')} style={{ flexDirection: 'row', gap: spacing.sm }}>
          {row.map(id => (
            <PlatformTile
              key={id}
              id={id}
              selected={selected.includes(id)}
              onToggle={onToggle}
              role={mode === 'single' ? 'radio' : 'checkbox'}
              testID={testIDPrefix ? `${testIDPrefix}-${id}` : undefined}
            />
          ))}
          {/* Keep the last tile half-width when the count is odd. */}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
