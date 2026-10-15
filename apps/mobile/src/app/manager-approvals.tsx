import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-context";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { colors, radii, spacing } from "@/constants/design";
import { useApiResource } from "@/hooks/use-api-resource";
import { ApiError } from "@/lib/api-client";
import { useState } from "react";

type Registration = { id: string; role: string; createdAt: string; user: { id: string; fullName: string; email: string } };
export default function ManagerApprovalsScreen() {
  const { session, request } = useAuth(); const { data, loading, error, reload } = useApiResource<{ registrations: Registration[] }>("/v1/admin/manager-registrations"); const [busyId, setBusyId] = useState<string | null>(null); const [actionError, setActionError] = useState<string | null>(null);
  async function approve(id: string) { setBusyId(id); setActionError(null); try { await request(`/v1/admin/manager-registrations/${id}/approve`, { method: "POST" }); await reload(); } catch (reason) { setActionError(reason instanceof ApiError ? reason.message : "Could not approve manager."); } finally { setBusyId(null); } }
  if (session?.membership.role !== "SUPER_ADMIN") return <ErrorState message="Only a Super Admin can access manager approvals." onRetry={() => undefined} />;
  const registrations = data?.registrations ?? [];
  return <SafeAreaView style={styles.safe} edges={["bottom"]}><ScrollView contentContainerStyle={styles.content}>{loading && <LoadingState />}{error && <ErrorState message={error} onRetry={() => void reload()} />}{actionError && <Text style={styles.error}>{actionError}</Text>}{!loading && !error && registrations.length === 0 && <EmptyState title="No pending registrations" detail="New manager signups will appear here for your approval." />}{registrations.map((item) => <View key={item.id} style={styles.card}><Text style={styles.name}>{item.user.fullName}</Text><Text style={styles.email}>{item.user.email}</Text><Text style={styles.role}>{item.role.replaceAll("_", " ")}</Text><Pressable disabled={busyId === item.id} onPress={() => void approve(item.id)} style={[styles.button, busyId === item.id && styles.disabled]}><Text style={styles.buttonText}>{busyId === item.id ? "Approving…" : "Approve manager"}</Text></Pressable></View>)}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg }, error: { color: "#A12A2A", marginBottom: spacing.md }, card: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md }, name: { color: colors.ink, fontWeight: "800", fontSize: 17 }, email: { color: colors.muted, marginTop: 4 }, role: { color: colors.goldDark, fontWeight: "800", fontSize: 12, marginTop: 10 }, button: { backgroundColor: colors.navy, borderRadius: radii.sm, alignItems: "center", padding: 13, marginTop: spacing.md }, buttonText: { color: colors.white, fontWeight: "800" }, disabled: { opacity: 0.5 } });
