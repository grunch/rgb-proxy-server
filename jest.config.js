module.exports = {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { /* ts-jest config goes here in Jest */ }],
  },
  testMatch: ["**/test/**/*.spec.(ts|js)"],
  testEnvironment: "node",
};
