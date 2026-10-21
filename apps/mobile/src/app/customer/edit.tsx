import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { CustomerForm, type Cadence, type CustomerFormValues } from "@/components/customer-form";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { colors, spacing } from "@/constants/design";
import { useApiResource } from "@/hooks/use-api-resource";
import { ApiError } from "@/lib/api-client";
import type { CustomerDetail } from "@/types/api";

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useAuth();
  const { data, loading, error, reload } = useApiResource<{ data: CustomerDetail }>(`/v1/customers/${id}`);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const customer = data?.data;

  if (loading) return <LoadingState label="Loading customer details…" />;
  if (error || !customer) return <ErrorState message={error ?? "Customer not found"} onRetry={() => void reload()} />;

  const series = customer.followUpSeries?.[0];
  const initialValues: CustomerFormValues = {
    fullName: customer.fullName,
    mobileNumber: customer.mobileNumber,
    alternatePhone: customer.alternatePhone ?? "",
    email: customer.email ?? "",
    gender: customer.gender ?? "",
    dateOfBirth: customer.dateOfBirth?.slice(0, 10) ?? "",
    profession: customer.profession ?? "",
    company: customer.company ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    pinCode: customer.pinCode ?? "",
    preferredLanguage: customer.preferredLanguage ?? "",
    notes: customer.notes ?? "",
    cadence: (series?.cadence as Cadence | undefined) ?? "NONE",
    customIntervalDays: series?.cadence === "CUSTOM" && series.customIntervalMinutes
      ? String(Math.round(series.customIntervalMinutes / 1440))
      : "",
    allowPhone: customer.allowPhone,
    allowWhatsapp: customer.allowWhatsapp,
    allowSms: customer.allowSms
  };

  async function submit(values: CustomerFormValues) {
    if (values.fullName.trim().length < 2 || values.mobileNumber.trim().length < 7) {
      setActionError("Full name and a valid mobile number are required.");
      return;
    }
    const intervalDays = Number(values.customIntervalDays);
    if (values.cadence === "CUSTOM" && (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365)) {
      setActionError("Custom contact frequency must be between 1 and 365 days.");
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      const nullable = (value: string) => value.trim() || null;
      await request(`/v1/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: values.fullName.trim(),
          mobileNumber: values.mobileNumber.trim(),
          alternatePhone: nullable(values.alternatePhone),
          email: nullable(values.email),
          gender: values.gender || null,
          dateOfBirth: nullable(values.dateOfBirth),
          profession: nullable(values.profession),
          company: nullable(values.company),
          address: nullable(values.address),
          city: nullable(values.city),
          state: nullable(values.state),
          pinCode: nullable(values.pinCode),
          preferredLanguage: nullable(values.preferredLanguage),
          notes: nullable(values.notes),
          communicationPreferences: {
            allowPhone: values.allowPhone,
            allowWhatsapp: values.allowWhatsapp,
            allowSms: values.allowSms
          },
          contactFrequency: values.cadence === "NONE"
            ? null
            : values.cadence === "CUSTOM"
              ? { cadence: values.cadence, intervalDays }
              : { cadence: values.cadence }
        })
      });
      router.replace({ pathname: "/customer/[id]", params: { id } });
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : "Could not update customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CustomerForm initialValues={initialValues} error={actionError} loading={saving} submitLabel="Save changes" onSubmit={(values) => void submit(values)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 50 }
});
