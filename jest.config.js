/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./jest.setup.js"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  coverageDirectory: "coverage",
  coverageReporters: ["json", "lcov", "text", "clover"],
  collectCoverageFrom: ["src/**/*.{js,ts}", "!src/**/*.d.ts", "!src/index.ts"],
  //coverageThreshold: {
  //  global: {
  //    branches: 70,
  //    functions: 70,
  //    lines: 70,
  //    statements: 70,
  //  },
  //},
};
