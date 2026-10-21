/* global afterEach */
const opSqlite = require('@op-engineering/op-sqlite');
const keychain = require('react-native-keychain');

afterEach(() => {
  opSqlite.__reset();
  keychain.__reset();
});
