import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { colors, radii, spacing } from "@/constants/design";
import { useApiResource } from "@/hooks/use-api-resource";
import { ApiError } from "@/lib/api-client";
import type { ManagerSummary } from "@/types/api";

type Registration = {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string };
};

export default function ManagerApprovalsScreen() {
  const { session, request } = useAuth();
  const { data, loading, error, reload } = useApiResource<{ registrations: Registration[] }>("/v1/admin/manager-registrations");
  const { data: managersData, reload: reloadManagers } = useApiResource<{ managers: ManagerSummary[] }>("/v1/admin/managers");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [replacements, setReplacements] = useState<Record<string, string | null>>({});
  const registrations = data?.registrations ?? [];
  const activeManagers = managersData?.managers ?? [];

  async function decide(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setActionError(null);
    setSuccess(null);
    try {
      const transferFromManagerId = replacements[id];
      const result = await request<{ transferredCustomers?: number }>(`/v1/admin/manager-registrations/${id}/${decision}`, {
        method: "POST",
        ...(decision === "approve" && { body: JSON.stringify(transferFromManagerId ? { transferFromManagerId } : {}) })
      });
      if (decision === "approve") setSuccess(transferFromManagerId ? `Preacher approved. ${result.transferredCustomers ?? 0} contacts transferred and the previous Preacher was deactivated.` : "Preacher approved successfully.");
      await reload();
      await reloadManagers();
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : `Could not ${decision} Preacher.`);
    } finally {
      setBusyId(null);
    }
  }

  function confirmApprove(registration: Registration) {
    const previousId = replacements[registration.id];
    if (!previousId) return void decide(registration.id, "approve");
    const previous = activeManagers.find((manager) => manager.id === previousId);
    const message = `All ${previous?._count.assignedCustomers ?? 0} contacts, pending reminders and follow-ups will move from ${previous?.user.fullName ?? "the previous Preacher"}. The previous Preacher will be deactivated.`;
    if (Platform.OS === "web") {
      if (globalThis.confirm(`Approve and replace Preacher?\n\n${message}`)) void decide(registration.id, "approve");
      return;
    }
    Alert.alert("Approve and replace Preacher?", message, [{ text: "Cancel", style: "cancel" }, { text: "Approve & transfer", onPress: () => void decide(registration.id, "approve") }]);
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
    return <ErrorState message="Only a Super Admin can access Preacher approvals." onRetry={() => undefined} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={() => void reload()} />}
        {actionError && <Text style={styles.error}>{actionError}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}
        {!loading && !error && registrations.length === 0 && <EmptyState title="No pending registrations" detail="New Preacher signups will appear here for your approval." />}
        {registrations.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.user.fullName}</Text>
            <Text style={styles.email}>{item.user.email}</Text>
            <Text style={styles.role}>{item.role.replaceAll("_", " ")}</Text>
            <Text style={styles.requested}>Requested {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(item.createdAt))}</Text>
            <Text style={styles.transferLabel}>Contact assignment after approval</Text>
            <Text style={styles.transferHint}>Optionally choose an existing Preacher if this registration is replacing them. Contacts can also be reassigned later at any time.</Text>
            <View style={styles.managerOptions}>
              <Pressable onPress={() => setReplacements((current) => ({ ...current, [item.id]: null }))} style={[styles.managerOption, !replacements[item.id] && styles.managerOptionActive]}><Text style={[styles.managerOptionText, !replacements[item.id] && styles.managerOptionTextActive]}>No transfer</Text></Pressable>
              {activeManagers.map((manager) => <Pressable key={manager.id} onPress={() => setReplacements((current) => ({ ...current, [item.id]: manager.id }))} style={[styles.managerOption, replacements[item.id] === manager.id && styles.managerOptionActive]}><Text style={[styles.managerOptionText, replacements[item.id] === manager.id && styles.managerOptionTextActive]}>Replace {manager.user.fullName} · {manager._count.assignedCustomers}</Text></Pressable>)}
            </View>
            <View style={styles.actions}>
              <Pressable disabled={busyId !== null} onPress={() => confirmReject(item)} style={[styles.button, styles.rejectButton, busyId !== null && styles.disabled]}>
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
              <Pressable disabled={busyId !== null} onPress={() => confirmApprove(item)} style={[styles.button, styles.approveButton, busyId !== null && styles.disabled]}>
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
  success: { color: "#237A44", marginBottom: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
  name: { color: colors.ink, fontWeight: "800", fontSize: 17 },
  email: { color: colors.muted, marginTop: 4 },
  role: { color: colors.goldDark, fontWeight: "800", fontSize: 12, marginTop: 10 },
  requested: { color: colors.muted, fontSize: 11, marginTop: 5 },
  transferLabel: { color: colors.ink, fontWeight: "800", fontSize: 13, marginTop: spacing.md },
  transferHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  managerOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  managerOption: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  managerOptionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  managerOptionText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  managerOptionTextActive: { color: colors.white },
  actions: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  button: { flex: 1, borderRadius: radii.sm, alignItems: "center", padding: 13 },
  approveButton: { backgroundColor: colors.navy },
  rejectButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#A12A2A" },
  approveText: { color: colors.white, fontWeight: "800" },
  rejectText: { color: "#A12A2A", fontWeight: "800" },
  disabled: { opacity: 0.5 }
});
