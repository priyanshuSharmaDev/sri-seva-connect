import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { colors, radii, spacing } from "@/constants/design";
import { useApiResource } from "@/hooks/use-api-resource";
import type { ManagerSummary } from "@/types/api";

export default function ManagersScreen() {
  const { session } = useAuth();
  const { data, loading, error, reload } = useApiResource<{ managers: ManagerSummary[] }>(session?.membership.role === "SUPER_ADMIN" ? "/v1/admin/managers" : null);
  if (session?.membership.role !== "SUPER_ADMIN") return <ErrorState message="Only a Super Admin can view active Preachers." onRetry={() => undefined} />;
  const managers = data?.managers ?? [];
  return <SafeAreaView style={styles.safe} edges={["bottom"]}><ScrollView contentContainerStyle={styles.content}><Text style={styles.intro}>Each contact has an assigned Preacher. Open any Preacher to view or reassign some or all of their contacts.</Text>{loading && <LoadingState />}{error && <ErrorState message={error} onRetry={() => void reload()} />}{!loading && !error && managers.length === 0 && <EmptyState title="No active Preachers" detail="Approve a Preacher registration to start assigning contacts." />}{managers.map((manager) => <Link key={manager.id} href={{ pathname: "/manager-customers", params: { id: manager.id } }} asChild><Pressable style={styles.card}><View style={styles.avatar}><Text style={styles.initials}>{initials(manager.user.fullName)}</Text></View><View style={styles.copy}><Text style={styles.name}>{manager.user.fullName}</Text><Text style={styles.email}>{manager.user.email}</Text><Text style={styles.role}>PREACHER</Text></View><View style={styles.count}><Text style={styles.countValue}>{manager._count.assignedCustomers}</Text><Text style={styles.countLabel}>contacts</Text></View></Pressable></Link>)}</ScrollView></SafeAreaView>;
}

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg }, intro: { color: colors.muted, lineHeight: 20, marginBottom: spacing.lg }, card: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, flexDirection: "row", alignItems: "center", marginBottom: 10 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.goldPale, alignItems: "center", justifyContent: "center" }, initials: { color: colors.navy, fontWeight: "900" }, copy: { flex: 1, paddingHorizontal: 13 }, name: { color: colors.ink, fontWeight: "800", fontSize: 16 }, email: { color: colors.muted, fontSize: 12, marginTop: 3 }, role: { color: colors.goldDark, fontSize: 11, fontWeight: "800", marginTop: 6 }, count: { alignItems: "center", minWidth: 54 }, countValue: { color: colors.navy, fontWeight: "900", fontSize: 20 }, countLabel: { color: colors.muted, fontSize: 10 } });
