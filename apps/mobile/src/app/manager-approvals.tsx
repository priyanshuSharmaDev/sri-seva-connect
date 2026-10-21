import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { colors, radii, spacing } from "@/constants/design";
import { useApiResource } from "@/hooks/use-api-resource";
import { ApiError } from "@/lib/api-client";

type Registration = {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string };
};

export default function ManagerApprovalsScreen() {
  const { session, request } = useAuth();
  const { data, loading, error, reload } = useApiResource<{ registrations: Registration[] }>("/v1/admin/manager-registrations");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const registrations = data?.registrations ?? [];

  async function decide(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setActionError(null);
    try {
      await request(`/v1/admin/manager-registrations/${id}/${decision}`, { method: "POST" });
      await reload();
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : `Could not ${decision} manager.`);
    } finally {
      setBusyId(null);
    }
  }

  function confirmReject(registration: Registration) {
    const message = `${registration.user.fullName} will not be able to sign in. They may register again later.`;
    if (Platform.OS === "web") {
      if (globalThis.confirm(`Reject registration?\n\n${message}`)) void decide(registration.id, "reject");
      return;
    }
    Alert.alert(
      "Reject registration?",
      message,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: () => void decide(registration.id, "reject") }
      ]
    );
  }

  if (session?.membership.role !== "SUPER_ADMIN") {
    return <ErrorState message="Only a Super Admin can access manager approvals." onRetry={() => undefined} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={() => void reload()} />}
        {actionError && <Text style={styles.error}>{actionError}</Text>}
        {!loading && !error && registrations.length === 0 && <EmptyState title="No pending registrations" detail="New manager signups will appear here for your approval." />}
        {registrations.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.user.fullName}</Text>
            <Text style={styles.email}>{item.user.email}</Text>
            <Text style={styles.role}>{item.role.replaceAll("_", " ")}</Text>
            <Text style={styles.requested}>Requested {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(item.createdAt))}</Text>
            <View style={styles.actions}>
              <Pressable disabled={busyId !== null} onPress={() => confirmReject(item)} style={[styles.button, styles.rejectButton, busyId !== null && styles.disabled]}>
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
              <Pressable disabled={busyId !== null} onPress={() => void decide(item.id, "approve")} style={[styles.button, styles.approveButton, busyId !== null && styles.disabled]}>
                <Text style={styles.approveText}>{busyId === item.id ? "Working…" : "Approve"}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg },
  error: { color: "#A12A2A", marginBottom: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
  name: { color: colors.ink, fontWeight: "800", fontSize: 17 },
  email: { color: colors.muted, marginTop: 4 },
  role: { color: colors.goldDark, fontWeight: "800", fontSize: 12, marginTop: 10 },
  requested: { color: colors.muted, fontSize: 11, marginTop: 5 },
  actions: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  button: { flex: 1, borderRadius: radii.sm, alignItems: "center", padding: 13 },
  approveButton: { backgroundColor: colors.navy },
  rejectButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#A12A2A" },
  approveText: { color: colors.white, fontWeight: "800" },
  rejectText: { color: "#A12A2A", fontWeight: "800" },
  disabled: { opacity: 0.5 }
});
