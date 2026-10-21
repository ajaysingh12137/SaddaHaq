import { DEFAULT_ELIGIBILITY_CONFIG, computeEligibility } from '@saddahaq/shared';

// Guards the workspace wiring: the app must resolve the shared package.
test('mobile can use the shared eligibility logic', () => {
  const result = computeEligibility(
    [{ date: '2026-10-14', platform: 'zomato' }],
    DEFAULT_ELIGIBILITY_CONFIG,
    {
      today: '2026-10-15',
    },
  );
  expect(result.combined).toBe(1);
});
