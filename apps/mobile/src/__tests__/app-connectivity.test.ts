import { handleConnectivityChange } from '../App';
import { flushProfile } from '../services/session';
import { requestSync } from '../services/sync';
import { resetSessionStore, setSession } from '../state/sessionStore';

jest.mock('../services/session', () => ({
  ...jest.requireActual('../services/session'),
  flushProfile: jest.fn(async () => undefined),
}));
jest.mock('../services/sync', () => ({
  ...jest.requireActual('../services/sync'),
  requestSync: jest.fn(),
}));

describe('handleConnectivityChange', () => {
  beforeEach(() => {
    resetSessionStore();
    jest.mocked(flushProfile).mockClear();
    jest.mocked(requestSync).mockClear();
  });

  // Regression (found on a real phone): NetInfo fires on subscribe, before the
  // database is open; touching it then threw "Database not opened yet".
  it('does nothing while the app is still booting', () => {
    handleConnectivityChange({ isConnected: true });
    expect(flushProfile).not.toHaveBeenCalled();
    expect(requestSync).not.toHaveBeenCalled();
  });

  it('pushes profile changes and syncs when the connection comes back', () => {
    setSession({ status: 'ready' });
    handleConnectivityChange({ isConnected: false });
    expect(requestSync).not.toHaveBeenCalled();
    handleConnectivityChange({ isConnected: true });
    expect(flushProfile).toHaveBeenCalledTimes(1);
    expect(requestSync).toHaveBeenCalledTimes(1);
  });
});
