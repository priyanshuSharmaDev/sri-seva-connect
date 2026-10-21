import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Field, FormMessage, PrimaryButton } from "@/components/form-controls";
import { colors, radii, spacing } from "@/constants/design";

export type Cadence = "NONE" | "WEEKLY" | "TWICE_WEEKLY" | "MONTHLY" | "CUSTOM";
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
  allowSms: true
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

function ChoiceGroup({ label, options, selected, onSelect }: { label: string; options: { value: string; label: string }[]; selected: string; onSelect: (value: string) => void }) {
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
  optionTextActive: { color: colors.white }
});
