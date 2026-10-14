import { hash } from "bcryptjs";
import { prisma } from "../db/client.js";

const passwordHash = await hash("Welcome123!", 12);

const organization = await prisma.organization.upsert({
  where: { id: "11111111-1111-4111-8111-111111111111" },
  update: {},
  create: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Sri Seva Demo",
    timezone: "Asia/Kolkata"
  }
});

const admin = await prisma.user.upsert({
  where: { email: "admin@sriseva.local" },
  update: { passwordHash },
  create: { email: "admin@sriseva.local", fullName: "Demo Administrator", passwordHash }
});

const manager = await prisma.user.upsert({
  where: { email: "manager@sriseva.local" },
  update: { passwordHash },
  create: { email: "manager@sriseva.local", fullName: "Ananya Rao", passwordHash }
});

await prisma.organizationMembership.upsert({
  where: { organizationId_userId: { organizationId: organization.id, userId: admin.id } },
  update: { role: "SUPER_ADMIN", isActive: true },
  create: { organizationId: organization.id, userId: admin.id, role: "SUPER_ADMIN" }
});

await prisma.organizationMembership.upsert({
  where: { organizationId_userId: { organizationId: organization.id, userId: manager.id } },
  update: { role: "STORE_MANAGER", isActive: true },
  create: { organizationId: organization.id, userId: manager.id, role: "STORE_MANAGER" }
});

console.info("Seeded demo users. Password: Welcome123!");
await prisma.$disconnect();
