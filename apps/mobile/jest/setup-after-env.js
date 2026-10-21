/* global afterEach, beforeEach, jest */
const opSqlite = require('@op-engineering/op-sqlite');
const keychain = require('react-native-keychain');
const { Animated } = require('react-native');

// Animations finish at once in tests, so no frame updates land after a test ends
// (outside act). The app itself still animates.
beforeEach(() => {
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => ({
    start: callback => {
      value.setValue(config.toValue);
      callback?.({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  }));
});

afterEach(() => {
  opSqlite.__reset();
  keychain.__reset();
});
