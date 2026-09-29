module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/lib/utils.ts',
    'src/features/calendar/helpers.ts',
    'src/features/calendar/requests.ts',
    'src/features/calendar/hooks.ts',
    'src/features/calendar/constants.ts',
    'src/features/calendar/schemas.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
