import prisma from "../prisma/client";
import { clearDatabase } from "./helpers/cleanup";

describe("User", () => {
  beforeEach(async () => {
    await clearDatabase()
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("create user", async () => {
    const user = await prisma.user.create({
      data: {
        name: "Aman Singh",
        email: "aman@example.com",
        passwordHash: "password"
      }
    })

    expect(user).toBeDefined()
    expect(user.id).toBeDefined()
    expect(user.name).toBe("Aman Singh")
    expect(user.email).toBe("aman@example.com")
  })
})