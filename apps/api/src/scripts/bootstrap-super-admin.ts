import { hash } from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";

const BootstrapInputSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(12).max(128)
});

const input = BootstrapInputSchema.parse({
  email: process.env.SUPER_ADMIN_EMAIL,
  fullName: process.env.SUPER_ADMIN_FULL_NAME,
  password: process.env.SUPER_ADMIN_PASSWORD
});

try {
  const passwordHash = await hash(input.password, 12);

  await prisma.$transaction(async (transaction) => {
    const organization = await transaction.organization.upsert({
      where: { id: env.ORGANIZATION_ID },
      update: { name: env.ORGANIZATION_NAME },
      create: {
        id: env.ORGANIZATION_ID,
        name: env.ORGANIZATION_NAME,
        timezone: "Asia/Kolkata"
      }
    });

    const user = await transaction.user.upsert({
      where: { email: input.email.toLowerCase() },
      update: { fullName: input.fullName, passwordHash },
      create: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        passwordHash
      }
    });

    await transaction.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      update: { role: "SUPER_ADMIN", isActive: true },
      create: {
        organizationId: organization.id,
        userId: user.id,
        role: "SUPER_ADMIN",
        isActive: true
      }
    });

    await transaction.refreshSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  });

  console.info(`Super Admin is ready: ${input.email.toLowerCase()}`);
} finally {
  await prisma.$disconnect();
}
