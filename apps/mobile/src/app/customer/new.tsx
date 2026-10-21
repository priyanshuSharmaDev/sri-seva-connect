import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { CustomerForm, emptyCustomerFormValues, familyMembersPayload, validateCustomerForm, type CustomerFormValues } from "@/components/customer-form";
import { colors, spacing } from "@/constants/design";
import { ApiError } from "@/lib/api-client";

export default function NewCustomerScreen() {
  const { request } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(values: CustomerFormValues) {
    const validationError = validateCustomerForm(values);
    if (validationError) return setError(validationError);
    const intervalDays = Number(values.customIntervalDays);

    setLoading(true);
    setError(null);
    try {
      const profile = Object.fromEntries(
        Object.entries(values).filter(([key, value]) =>
          !["cadence", "customIntervalDays", "allowPhone", "allowWhatsapp", "allowSms", "gender", "familyMembers"].includes(key)
          && typeof value === "string"
          && value.trim() !== ""
        )
      );
      const body: Record<string, unknown> = {
        ...profile,
        ...(values.gender && { gender: values.gender }),
        communicationPreferences: {
          allowPhone: values.allowPhone,
          allowWhatsapp: values.allowWhatsapp,
          allowSms: values.allowSms
        },
        familyMembers: familyMembersPayload(values.familyMembers)
      };
      if (values.cadence !== "NONE") {
        body.contactFrequency = values.cadence === "CUSTOM"
          ? { cadence: values.cadence, intervalDays }
          : { cadence: values.cadence };
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
        <CustomerForm initialValues={emptyCustomerFormValues} error={error} loading={loading} submitLabel="Create customer" onSubmit={(values) => void submit(values)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 50 },
  intro: { color: colors.muted, lineHeight: 20, marginBottom: spacing.lg }
});
