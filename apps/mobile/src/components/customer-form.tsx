import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Field, FormMessage, PrimaryButton } from "@/components/form-controls";
import { colors, radii, spacing } from "@/constants/design";

export type Cadence = "NONE" | "WEEKLY" | "TWICE_WEEKLY" | "MONTHLY" | "CUSTOM";
export type FamilyMemberFormValues = {
  id?: string;
  localId: string;
  name: string;
  relationship: "SPOUSE" | "SON" | "DAUGHTER" | "PARENT" | "SIBLING" | "CUSTOM";
  customRelationship: string;
  dateOfBirth: string;
  phoneNumber: string;
  profession: string;
  anniversaryDate: string;
  notes: string;
};
export type CustomerFormValues = {
  fullName: string;
  mobileNumber: string;
  alternatePhone: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  profession: string;
  company: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  preferredLanguage: string;
  notes: string;
  cadence: Cadence;
  customIntervalDays: string;
  allowPhone: boolean;
  allowWhatsapp: boolean;
  allowSms: boolean;
  familyMembers: FamilyMemberFormValues[];
};

export const emptyCustomerFormValues: CustomerFormValues = {
  fullName: "",
  mobileNumber: "",
  alternatePhone: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  profession: "",
  company: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  preferredLanguage: "",
  notes: "",
  cadence: "NONE",
  customIntervalDays: "",
  allowPhone: true,
  allowWhatsapp: true,
  allowSms: true,
  familyMembers: []
};

const frequencyOptions: { value: Cadence; label: string }[] = [
  { value: "NONE", label: "Not set" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "TWICE_WEEKLY", label: "Twice weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" }
];

const genderOptions = [
  { value: "", label: "Not specified" },
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" }
];

const relationshipOptions: { value: FamilyMemberFormValues["relationship"]; label: string }[] = [
  { value: "SPOUSE", label: "Spouse" },
  { value: "SON", label: "Son" },
  { value: "DAUGHTER", label: "Daughter" },
  { value: "PARENT", label: "Parent" },
  { value: "SIBLING", label: "Sibling" },
  { value: "CUSTOM", label: "Other" }
];

let familyMemberSequence = 0;
export function emptyFamilyMember(): FamilyMemberFormValues {
  familyMemberSequence += 1;
  return {
    localId: `new-family-${Date.now()}-${familyMemberSequence}`,
    name: "",
    relationship: "SPOUSE",
    customRelationship: "",
    dateOfBirth: "",
    phoneNumber: "",
    profession: "",
    anniversaryDate: "",
    notes: ""
  };
}

export function validateCustomerForm(values: CustomerFormValues): string | null {
  if (values.fullName.trim().length < 2 || values.mobileNumber.trim().length < 7) return "Full name and a valid mobile number are required.";
  const intervalDays = Number(values.customIntervalDays);
  if (values.cadence === "CUSTOM" && (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365)) return "Custom contact frequency must be between 1 and 365 days.";
  for (const member of values.familyMembers) {
    if (member.name.trim().length < 2) return "Every family member must have a valid name.";
    if (member.relationship === "CUSTOM" && !member.customRelationship.trim()) return `Please enter the relationship for ${member.name.trim()}.`;
    if (member.phoneNumber.trim() && member.phoneNumber.trim().length < 7) return `Please enter a valid phone number for ${member.name.trim()}.`;
  }
  return null;
}

export function familyMembersPayload(members: FamilyMemberFormValues[]) {
  const optional = (value: string) => value.trim() || undefined;
  return members.map((member) => ({
    ...(member.id && { id: member.id }),
    name: member.name.trim(),
    relationship: member.relationship,
    ...(member.relationship === "CUSTOM" && { customRelationship: member.customRelationship.trim() }),
    ...(optional(member.dateOfBirth) && { dateOfBirth: optional(member.dateOfBirth) }),
    ...(optional(member.phoneNumber) && { phoneNumber: optional(member.phoneNumber) }),
    ...(optional(member.profession) && { profession: optional(member.profession) }),
    ...(optional(member.anniversaryDate) && { anniversaryDate: optional(member.anniversaryDate) }),
    ...(optional(member.notes) && { notes: optional(member.notes) })
  }));
}

type Props = {
  initialValues?: CustomerFormValues;
  error?: string | null;
  loading?: boolean;
  submitLabel: string;
  onSubmit: (values: CustomerFormValues) => void;
};

export function CustomerForm({ initialValues = emptyCustomerFormValues, error, loading = false, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState(initialValues);
  const field = (key: keyof CustomerFormValues) => ({
    value: String(values[key]),
    onChangeText: (value: string) => setValues((current) => ({ ...current, [key]: value }))
  });
  const select = <T extends string>(key: "gender" | "cadence", value: T) => {
    setValues((current) => ({ ...current, [key]: value }));
  };
  const toggle = (key: "allowPhone" | "allowWhatsapp" | "allowSms") => {
    setValues((current) => ({ ...current, [key]: !current[key] }));
  };
  const updateFamilyMember = (localId: string, key: keyof FamilyMemberFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      familyMembers: current.familyMembers.map((member) => member.localId === localId ? { ...member, [key]: value } : member)
    }));
  };
  const removeFamilyMember = (localId: string) => {
    setValues((current) => ({ ...current, familyMembers: current.familyMembers.filter((member) => member.localId !== localId) }));
  };

  return (
    <>
      <FormMessage message={error} />
      <Field label="Full name *" autoComplete="name" {...field("fullName")} />
      <Field label="Mobile number *" placeholder="10-digit Indian number or +country code" keyboardType="phone-pad" autoComplete="tel" {...field("mobileNumber")} />
      <Text style={styles.phoneHint}>Ten-digit numbers automatically use India country code +91 for calls, WhatsApp and SMS.</Text>
      <Field label="Alternate phone" keyboardType="phone-pad" {...field("alternatePhone")} />
      <Field label="Email" keyboardType="email-address" autoCapitalize="none" {...field("email")} />
      <ChoiceGroup label="Gender" options={genderOptions} selected={values.gender} onSelect={(value) => select("gender", value)} />
      <Field label="Date of birth (YYYY-MM-DD)" placeholder="1990-12-31" {...field("dateOfBirth")} />
      <Field label="Profession" {...field("profession")} />
      <Field label="Company" {...field("company")} />
      <Field label="Address" multiline {...field("address")} />
      <Field label="City" {...field("city")} />
      <Field label="State" {...field("state")} />
      <Field label="PIN code" keyboardType="number-pad" {...field("pinCode")} />
      <Field label="Preferred language" {...field("preferredLanguage")} />
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Family members</Text>
        <Text style={styles.sectionHint}>Add spouse, children, parents, siblings or another important relationship.</Text>
        {values.familyMembers.map((member, index) => (
          <View key={member.localId} style={styles.familyCard}>
            <View style={styles.familyHeader}><Text style={styles.familyTitle}>Family member {index + 1}</Text><Pressable accessibilityRole="button" onPress={() => removeFamilyMember(member.localId)}><Text style={styles.removeText}>Remove</Text></Pressable></View>
            <Field label="Name *" value={member.name} onChangeText={(value) => updateFamilyMember(member.localId, "name", value)} />
            <ChoiceGroup label="Relationship" options={relationshipOptions} selected={member.relationship} onSelect={(value) => updateFamilyMember(member.localId, "relationship", value)} />
            {member.relationship === "CUSTOM" && <Field label="Relationship name *" value={member.customRelationship} onChangeText={(value) => updateFamilyMember(member.localId, "customRelationship", value)} />}
            <Field label="Date of birth (YYYY-MM-DD)" value={member.dateOfBirth} onChangeText={(value) => updateFamilyMember(member.localId, "dateOfBirth", value)} />
            <Field label="Phone number" keyboardType="phone-pad" value={member.phoneNumber} onChangeText={(value) => updateFamilyMember(member.localId, "phoneNumber", value)} />
            <Field label="Profession" value={member.profession} onChangeText={(value) => updateFamilyMember(member.localId, "profession", value)} />
            <Field label="Anniversary date (YYYY-MM-DD)" value={member.anniversaryDate} onChangeText={(value) => updateFamilyMember(member.localId, "anniversaryDate", value)} />
            <Field label="Notes" multiline value={member.notes} onChangeText={(value) => updateFamilyMember(member.localId, "notes", value)} />
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={() => setValues((current) => ({ ...current, familyMembers: [...current.familyMembers, emptyFamilyMember()] }))} style={styles.addFamilyButton}><Text style={styles.addFamilyText}>+ Add family member</Text></Pressable>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Communication preferences</Text>
        <Text style={styles.sectionHint}>Only enabled contact actions will be shown for this customer.</Text>
        <View style={styles.optionRow}>
          <ToggleOption label="Phone" active={values.allowPhone} onPress={() => toggle("allowPhone")} />
          <ToggleOption label="WhatsApp" active={values.allowWhatsapp} onPress={() => toggle("allowWhatsapp")} />
          <ToggleOption label="SMS" active={values.allowSms} onPress={() => toggle("allowSms")} />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Contact frequency</Text>
        <Text style={styles.sectionHint}>Choose how often this manager should contact the customer.</Text>
        <View style={styles.optionRow}>
          {frequencyOptions.map((option) => <ToggleOption key={option.value} label={option.label} active={values.cadence === option.value} onPress={() => select("cadence", option.value)} radio />)}
        </View>
        {values.cadence === "CUSTOM" && <Field label="Repeat every (days)" keyboardType="number-pad" placeholder="For example: 14" {...field("customIntervalDays")} />}
      </View>
      <Field label="Private manager notes" multiline {...field("notes")} />
      <PrimaryButton label={submitLabel} loading={loading} onPress={() => onSubmit(values)} />
    </>
  );
}

function ChoiceGroup({ label, options, selected, onSelect }: { label: string; options: readonly { value: string; label: string }[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.choiceGroup}><Text style={styles.inputLabel}>{label}</Text><View style={styles.optionRow}>{options.map((option) => <ToggleOption key={option.value || "unset"} label={option.label} active={selected === option.value} onPress={() => onSelect(option.value)} radio />)}</View></View>;
}

function ToggleOption({ label, active, onPress, radio = false }: { label: string; active: boolean; onPress: () => void; radio?: boolean }) {
  return <Pressable accessibilityRole={radio ? "radio" : "checkbox"} accessibilityState={radio ? { checked: active } : { checked: active }} onPress={onPress} style={[styles.option, active && styles.optionActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  phoneHint: { color: colors.goldDark, fontSize: 12, lineHeight: 17, marginTop: -8, marginBottom: 14 },
  section: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 14 },
  choiceGroup: { marginBottom: 14 },
  inputLabel: { color: colors.ink, fontWeight: "700", fontSize: 12, marginBottom: 6 },
  sectionLabel: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  sectionHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  optionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  optionTextActive: { color: colors.white },
  familyCard: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md, marginTop: spacing.sm },
  familyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  familyTitle: { color: colors.ink, fontWeight: "800" },
  removeText: { color: "#A12A2A", fontSize: 12, fontWeight: "800" },
  addFamilyButton: { borderWidth: 1, borderColor: colors.gold, borderRadius: radii.sm, padding: 12, alignItems: "center", marginTop: spacing.sm },
  addFamilyText: { color: colors.navy, fontWeight: "800" }
});
