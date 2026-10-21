import { z } from "zod";

export const RoleSchema = z.enum([
  "SUPER_ADMIN",
  "PREACHER"
]);

export const CommunicationPreferencesSchema = z.object({
  allowPhone: z.boolean().default(true),
  allowWhatsapp: z.boolean().default(true),
  allowSms: z.boolean().default(true)
});

export const ContactFrequencySchema = z.discriminatedUnion("cadence", [
  z.object({ cadence: z.enum(["WEEKLY", "TWICE_WEEKLY", "MONTHLY"]) }),
  z.object({
    cadence: z.literal("CUSTOM"),
    intervalDays: z.number().int().min(1).max(365)
  })
]);

const optionalText = z.string().trim().max(500).optional();
const optionalDate = z.iso.date().optional();
const familyMemberShape = {
  name: z.string().trim().min(2).max(120),
  relationship: z.enum(["SPOUSE", "SON", "DAUGHTER", "PARENT", "SIBLING", "CUSTOM"]),
  customRelationship: z.string().trim().max(50).optional(),
  dateOfBirth: optionalDate,
  phoneNumber: z.string().trim().min(7).max(24).optional(),
  profession: optionalText,
  anniversaryDate: optionalDate,
  notes: z.string().trim().max(2000).optional()
};

function validateFamilyRelationship(
  value: { relationship: string; customRelationship?: string | undefined },
  context: z.RefinementCtx
) {
  if (value.relationship === "CUSTOM" && !value.customRelationship) {
    context.addIssue({
      code: "custom",
      path: ["customRelationship"],
      message: "Custom relationship is required"
    });
  }
}

export const CreateFamilyMemberSchema = z.object(familyMemberShape).superRefine(validateFamilyRelationship);
export const CustomerFamilyMemberSchema = z.object({ id: z.uuid().optional(), ...familyMemberShape }).superRefine(validateFamilyRelationship);

export const CreateCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobileNumber: z.string().trim().min(7).max(24),
  assignedManagerId: z.uuid().optional(),
  alternatePhone: z.string().trim().min(7).max(24).optional(),
  email: z.email().optional(),
  gender: z.enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).optional(),
  dateOfBirth: optionalDate,
  profession: optionalText,
  company: optionalText,
  address: z.string().trim().max(1000).optional(),
  city: optionalText,
  state: optionalText,
  pinCode: z.string().trim().max(12).optional(),
  preferredLanguage: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(5000).optional(),
  communicationPreferences: CommunicationPreferencesSchema.optional(),
  contactFrequency: ContactFrequencySchema.optional(),
  familyMembers: z.array(CreateFamilyMemberSchema).max(50).optional()
});

const nullableText = z.string().trim().max(500).nullable().optional();
const nullableDate = z.iso.date().nullable().optional();

export const UpdateCustomerSchema = z.object({
  status: z.enum(["ACTIVE", "OUT_OF_SERVICE"]).optional(),
  fullName: z.string().trim().min(2).max(120).optional(),
  mobileNumber: z.string().trim().min(7).max(24).optional(),
  alternatePhone: z.string().trim().min(7).max(24).nullable().optional(),
  email: z.email().nullable().optional(),
  gender: z.enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).nullable().optional(),
  dateOfBirth: nullableDate,
  profession: nullableText,
  company: nullableText,
  address: z.string().trim().max(1000).nullable().optional(),
  city: nullableText,
  state: nullableText,
  pinCode: z.string().trim().max(12).nullable().optional(),
  preferredLanguage: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  communicationPreferences: CommunicationPreferencesSchema.optional(),
  contactFrequency: ContactFrequencySchema.nullable().optional(),
  familyMembers: z.array(CustomerFamilyMemberSchema).max(50).optional()
}).refine((value) => Object.keys(value).length > 0, { message: "At least one customer field is required" });

export const CreateOccasionSchema = z.object({
  familyMemberId: z.uuid().optional(),
  kind: z.enum(["BIRTHDAY", "WEDDING_ANNIVERSARY", "FESTIVAL", "CUSTOM", "MEMORIAL"]),
  title: z.string().trim().min(2).max(120),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  year: z.number().int().min(1800).max(2200).optional(),
  recurrence: z.enum(["NONE", "ANNUAL"]).default("ANNUAL"),
  timezone: z.string().trim().min(1).max(100).default("Asia/Kolkata"),
  managerNotes: z.string().trim().max(2000).optional(),
  visibility: z.enum(["STANDARD", "RESTRICTED"]).default("STANDARD"),
  reminderOffsetsInDays: z.array(z.number().int().min(0).max(365)).min(1).default([0, 1, 3, 7])
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128)
});

export const RegisterManagerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(12).max(128),
  role: z.literal("PREACHER").default("PREACHER")
});

export const ApproveManagerSchema = z.object({
  transferFromManagerId: z.uuid().optional()
});

export const TransferManagerCustomersSchema = z.object({
  toManagerId: z.uuid(),
  deactivateSource: z.boolean().default(false),
  customerIds: z.array(z.uuid()).min(1).max(500).optional()
}).superRefine((value, context) => {
  if (value.deactivateSource && value.customerIds) {
    context.addIssue({ code: "custom", path: ["deactivateSource"], message: "A partial transfer cannot deactivate the source manager" });
  }
});

export type Role = z.infer<typeof RoleSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type ContactFrequency = z.infer<typeof ContactFrequencySchema>;
export type CreateFamilyMemberInput = z.infer<typeof CreateFamilyMemberSchema>;
export type CustomerFamilyMemberInput = z.infer<typeof CustomerFamilyMemberSchema>;
export type CreateOccasionInput = z.infer<typeof CreateOccasionSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterManagerInput = z.infer<typeof RegisterManagerSchema>;
