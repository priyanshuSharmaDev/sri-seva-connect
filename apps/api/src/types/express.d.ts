import type { Role } from "@ssc/contracts";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        membershipId: string;
        organizationId: string;
        role: Role;
      };
    }
  }
}

export {};
