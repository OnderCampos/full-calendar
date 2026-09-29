module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/lib/utils.ts',
    'src/features/calendar/helpers.ts',
    'src/features/calendar/requests.ts',
    'src/features/calendar/schemas.ts',
    'src/features/calendar/constants.ts',
    'src/features/calendar/mocks.ts',
  ],
};
