import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { EshramGuideScreen } from '../features/eshram/EshramGuideScreen';
import { SchemeDetailScreen } from '../features/schemes/SchemeDetailScreen';
import { MainTabs } from './MainTabs';
import { type MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="EshramGuide" component={EshramGuideScreen} />
      <Stack.Screen name="SchemeDetail" component={SchemeDetailScreen} />
    </Stack.Navigator>
  );
}
