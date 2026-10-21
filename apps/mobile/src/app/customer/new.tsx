import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { Field, FormMessage, PrimaryButton } from "@/components/form-controls";
import { colors, radii, spacing } from "@/constants/design";
import { ApiError } from "@/lib/api-client";

type Cadence = "NONE" | "WEEKLY" | "TWICE_WEEKLY" | "MONTHLY" | "CUSTOM";
type CustomerForm = {
  fullName: string;
  mobileNumber: string;
  alternatePhone: string;
  email: string;
  dateOfBirth: string;
  profession: string;
  company: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  preferredLanguage: string;
  notes: string;
};

const initialForm: CustomerForm = {
  fullName: "",
  mobileNumber: "",
  alternatePhone: "",
  email: "",
  dateOfBirth: "",
  profession: "",
  company: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  preferredLanguage: "",
  notes: ""
};

const frequencyOptions: { value: Cadence; label: string }[] = [
  { value: "NONE", label: "Not set" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "TWICE_WEEKLY", label: "Twice weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" }
];

export default function NewCustomerScreen() {
  const { request } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [cadence, setCadence] = useState<Cadence>("NONE");
  const [customIntervalDays, setCustomIntervalDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const field = (key: keyof CustomerForm) => ({
    value: form[key],
    onChangeText: (value: string) => setForm((current) => ({ ...current, [key]: value }))
  });

  async function submit() {
    if (form.fullName.trim().length < 2 || form.mobileNumber.trim().length < 7) {
      setError("Full name and a valid mobile number are required.");
      return;
    }
    const intervalDays = Number(customIntervalDays);
    if (cadence === "CUSTOM" && (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365)) {
      setError("Custom contact frequency must be between 1 and 365 days.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value.trim() !== "")
      );
      if (cadence !== "NONE") {
        body.contactFrequency = cadence === "CUSTOM"
          ? { cadence, intervalDays }
          : { cadence };
      }
      const created = await request<{ data: { id: string } }>("/v1/customers", {
        method: "POST",
        body: JSON.stringify(body)
      });
      router.replace({ pathname: "/customer/[id]", params: { id: created.data.id } });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not create customer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Only name and mobile are required. Add whatever relationship details are currently available.</Text>
        <FormMessage message={error} />
        <Field label="Full name *" autoComplete="name" {...field("fullName")} />
        <Field label="Mobile number *" placeholder="10-digit Indian number or +country code" keyboardType="phone-pad" autoComplete="tel" {...field("mobileNumber")} />
        <Text style={styles.phoneHint}>Ten-digit numbers automatically use India country code +91 for calls, WhatsApp and SMS.</Text>
        <Field label="Alternate phone" keyboardType="phone-pad" {...field("alternatePhone")} />
        <Field label="Email" keyboardType="email-address" autoCapitalize="none" {...field("email")} />
        <Field label="Date of birth (YYYY-MM-DD)" placeholder="1990-12-31" {...field("dateOfBirth")} />
        <Field label="Profession" {...field("profession")} />
        <Field label="Company" {...field("company")} />
        <Field label="Address" multiline {...field("address")} />
        <Field label="City" {...field("city")} />
        <Field label="State" {...field("state")} />
        <Field label="PIN code" keyboardType="number-pad" {...field("pinCode")} />
        <Field label="Preferred language" {...field("preferredLanguage")} />
        <View style={styles.frequencySection}>
          <Text style={styles.sectionLabel}>Contact frequency</Text>
          <Text style={styles.sectionHint}>Choose how often this manager should contact the customer.</Text>
          <View style={styles.optionRow}>
            {frequencyOptions.map((option) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: cadence === option.value }}
                key={option.value}
                onPress={() => setCadence(option.value)}
                style={[styles.option, cadence === option.value && styles.optionActive]}
              >
                <Text style={[styles.optionText, cadence === option.value && styles.optionTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          {cadence === "CUSTOM" && <Field label="Repeat every (days)" value={customIntervalDays} onChangeText={setCustomIntervalDays} keyboardType="number-pad" placeholder="For example: 14" />}
        </View>
        <Field label="Private manager notes" multiline {...field("notes")} />
        <PrimaryButton label="Create customer" loading={loading} onPress={() => void submit()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 50 },
  intro: { color: colors.muted, lineHeight: 20, marginBottom: spacing.lg },
  phoneHint: { color: colors.goldDark, fontSize: 12, lineHeight: 17, marginTop: -8, marginBottom: 14 },
  frequencySection: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 14 },
  sectionLabel: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  sectionHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  optionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  optionTextActive: { color: colors.white }
});
