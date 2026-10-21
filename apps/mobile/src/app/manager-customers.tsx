import { Link, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { colors, radii, spacing } from "@/constants/design";
import { useApiResource } from "@/hooks/use-api-resource";
import type { CustomerSummary } from "@/types/api";

type ManagerCustomersResponse = { manager: { id: string; role: string; user: { fullName: string; email: string } }; customers: CustomerSummary[] };

export default function ManagerCustomersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const path = session?.membership.role === "SUPER_ADMIN" && id ? `/v1/admin/managers/${id}/customers` as const : null;
  const { data, loading, error, reload } = useApiResource<ManagerCustomersResponse>(path);
  const customers = useMemo(() => (data?.customers ?? []).filter((customer) => `${customer.fullName} ${customer.mobileNumber}`.toLowerCase().includes(search.trim().toLowerCase())), [data, search]);
  if (session?.membership.role !== "SUPER_ADMIN") return <ErrorState message="Only a Super Admin can view manager contacts." onRetry={() => undefined} />;
  return <SafeAreaView style={styles.safe} edges={["bottom"]}><ScrollView contentContainerStyle={styles.content}><View style={styles.managerCard}><Text style={styles.managerName}>{data?.manager.user.fullName ?? "Manager"}</Text>{data?.manager && <><Text style={styles.managerEmail}>{data.manager.user.email}</Text><Text style={styles.managerRole}>{data.manager.role.replaceAll("_", " ")}</Text></>}</View><TextInput accessibilityLabel="Search this manager's contacts" value={search} onChangeText={setSearch} placeholder="Search this manager's contacts" placeholderTextColor={colors.muted} style={styles.search} />{loading && <LoadingState />}{error && <ErrorState message={error} onRetry={() => void reload()} />}{!loading && !error && customers.length === 0 && <EmptyState title={search ? "No matching contacts" : "No assigned contacts"} detail={search ? "Try a different name or phone number." : "This manager does not currently own any customer contacts."} />}{customers.map((customer) => <Link key={customer.id} href={{ pathname: "/customer/[id]", params: { id: customer.id } }} asChild><Pressable style={styles.row}><View style={styles.copy}><Text style={styles.name}>{customer.fullName}</Text><Text style={styles.detail}>{[customer.city, customer.mobileNumber].filter(Boolean).join(" · ")}</Text></View><Text style={styles.chevron}>›</Text></Pressable></Link>)}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg }, managerCard: { backgroundColor: colors.navy, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md }, managerName: { color: colors.white, fontWeight: "800", fontSize: 19 }, managerEmail: { color: colors.blueGrey, marginTop: 4 }, managerRole: { color: colors.goldLight, fontSize: 11, fontWeight: "800", marginTop: 8 }, search: { height: 50, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.md }, row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 10 }, copy: { flex: 1 }, name: { color: colors.ink, fontWeight: "800" }, detail: { color: colors.muted, fontSize: 12, marginTop: 4 }, chevron: { color: colors.navy, fontSize: 25 } });
