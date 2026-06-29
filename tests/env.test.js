describe("Environment", () => {
  test("should load test database url", () => {
    expect(process.env.DATABASE_URL).toContain("docdock_test");
  });
});