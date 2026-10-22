module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  collectCoverageFrom: ['src/services/**/*.ts', '!src/services/**/*.d.ts'],
  coverageThreshold: {
    global: {
      statements: 70,
      lines: 70,
    },
    './src/services/authService.ts': {
      statements: 70,
      lines: 70,
    },
    './src/services/alertEngineService.ts': {
      statements: 70,
      lines: 70,
    },
    './src/services/nodeService.ts': {
      statements: 70,
      lines: 70,
    },
    './src/services/cropService.ts': {
      statements: 70,
      lines: 70,
    },
    './src/services/cropStateService.ts': {
      statements: 70,
      lines: 70,
    },
  },
};
