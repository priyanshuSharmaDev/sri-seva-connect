import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-context";
import { Field, FormMessage, PrimaryButton } from "@/components/form-controls";
import { colors, spacing } from "@/constants/design";
import { ApiError } from "@/lib/api-client";

type CustomerForm = { fullName: string; mobileNumber: string; alternatePhone: string; email: string; dateOfBirth: string; profession: string; company: string; address: string; city: string; state: string; pinCode: string; preferredLanguage: string; notes: string };
const initialForm: CustomerForm = { fullName: "", mobileNumber: "", alternatePhone: "", email: "", dateOfBirth: "", profession: "", company: "", address: "", city: "", state: "", pinCode: "", preferredLanguage: "", notes: "" };

export default function NewCustomerScreen() {
  const { request } = useAuth(); const [form, setForm] = useState(initialForm); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const field = (key: keyof CustomerForm) => ({ value: form[key], onChangeText: (value: string) => setForm((current) => ({ ...current, [key]: value })) });
  async function submit() { if (form.fullName.trim().length < 2 || form.mobileNumber.trim().length < 7) return setError("Full name and a valid mobile number are required."); setLoading(true); setError(null); try { const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim() !== "")); const created = await request<{ data: { id: string } }>("/v1/customers", { method: "POST", body: JSON.stringify(body) }); router.replace({ pathname: "/customer/[id]", params: { id: created.data.id } }); } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Could not create customer."); } finally { setLoading(false); } }
  return <SafeAreaView style={styles.safe} edges={["bottom"]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.intro}>Only name and mobile are required. Add whatever relationship details are currently available.</Text><FormMessage message={error} /><Field label="Full name *" autoComplete="name" {...field("fullName")} /><Field label="Mobile number *" keyboardType="phone-pad" autoComplete="tel" {...field("mobileNumber")} /><Field label="Alternate phone" keyboardType="phone-pad" {...field("alternatePhone")} /><Field label="Email" keyboardType="email-address" autoCapitalize="none" {...field("email")} /><Field label="Date of birth (YYYY-MM-DD)" placeholder="1990-12-31" {...field("dateOfBirth")} /><Field label="Profession" {...field("profession")} /><Field label="Company" {...field("company")} /><Field label="Address" multiline {...field("address")} /><Field label="City" {...field("city")} /><Field label="State" {...field("state")} /><Field label="PIN code" keyboardType="number-pad" {...field("pinCode")} /><Field label="Preferred language" {...field("preferredLanguage")} /><Field label="Private manager notes" multiline {...field("notes")} /><PrimaryButton label="Create customer" loading={loading} onPress={() => void submit()} /></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingBottom: 50 }, intro: { color: colors.muted, lineHeight: 20, marginBottom: spacing.lg } });
