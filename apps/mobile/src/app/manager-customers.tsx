import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { colors, radii, spacing } from "@/constants/design";
import { useApiResource } from "@/hooks/use-api-resource";
import { ApiError } from "@/lib/api-client";
import { confirmAction } from "@/lib/confirm-action";
import type { CustomerSummary, ManagerSummary } from "@/types/api";

type ManagerCustomersResponse = { manager: { id: string; role: string; user: { fullName: string; email: string } }; customers: CustomerSummary[] };

export default function ManagerCustomersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, request } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isAdmin = session?.membership.role === "SUPER_ADMIN";
  const path = isAdmin && id ? `/v1/admin/managers/${id}/customers` as const : null;
  const { data, loading, error, reload } = useApiResource<ManagerCustomersResponse>(path);
  const managersResource = useApiResource<{ managers: ManagerSummary[] }>(isAdmin ? "/v1/admin/managers" : null);
  const destinations = (managersResource.data?.managers ?? []).filter((manager) => manager.id !== id);
  const customers = useMemo(() => (data?.customers ?? []).filter((customer) => `${customer.fullName} ${customer.mobileNumber}`.toLowerCase().includes(search.trim().toLowerCase())), [data, search]);

  if (!isAdmin) return <ErrorState message="Only a Super Admin can view Preacher contacts." onRetry={() => undefined} />;

  function toggleCustomer(customerId: string) {
    setSelectedIds((current) => current.includes(customerId) ? current.filter((value) => value !== customerId) : [...current, customerId]);
  }

  async function transferSelected() {
    if (!id || !destinationId || selectedIds.length === 0) return;
    setBusy(true);
    setActionError(null);
    try {
      await request(`/v1/admin/managers/${id}/transfer`, { method: "POST", body: JSON.stringify({ toManagerId: destinationId, customerIds: selectedIds }) });
      setSelectedIds([]);
      setDestinationId(null);
      await Promise.all([reload(), managersResource.reload()]);
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : "Could not transfer the selected customers.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemoval() {
    if (!id || !data) return;
    const confirmed = await confirmAction("Remove Preacher?", data.customers.length ? "Transfer all assigned contacts first. The Preacher cannot be removed while contacts remain." : "This disables the Preacher account and signs it out on all devices.", "Remove Preacher");
    if (confirmed) await removeManager();
  }

  async function removeManager() {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      await request(`/v1/admin/managers/${id}/deactivate`, { method: "POST" });
      router.replace("/managers");
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : "Could not remove this Preacher.");
    } finally {
      setBusy(false);
    }
  }

  return <SafeAreaView style={styles.safe} edges={["bottom"]}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.managerCard}><Text style={styles.managerName}>{data?.manager.user.fullName ?? "Preacher"}</Text>{data?.manager && <><Text style={styles.managerEmail}>{data.manager.user.email}</Text><Text style={styles.managerRole}>PREACHER</Text></>}</View>
    {data && data.customers.length > 0 && <View style={styles.transferCard}>
      <View style={styles.transferHeading}><Text style={styles.transferTitle}>Reassign selected contacts</Text><Pressable onPress={() => setSelectedIds(selectedIds.length === data.customers.length ? [] : data.customers.map(({ id: customerId }) => customerId))}><Text style={styles.textAction}>{selectedIds.length === data.customers.length ? "Clear" : "Select all"}</Text></Pressable></View>
      <Text style={styles.transferHelp}>{selectedIds.length} selected · Choose any other active Preacher</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.managerChoices}>{destinations.map((manager) => <Pressable key={manager.id} onPress={() => setDestinationId(manager.id)} style={destinationId === manager.id ? styles.managerChoiceActive : styles.managerChoice}><Text style={destinationId === manager.id ? styles.managerChoiceTextActive : styles.managerChoiceText}>{manager.user.fullName}</Text></Pressable>)}</ScrollView>
      <Pressable disabled={busy || !destinationId || selectedIds.length === 0} onPress={() => void transferSelected()} style={busy || !destinationId || selectedIds.length === 0 ? styles.primaryDisabled : styles.primary}><Text style={styles.primaryText}>{busy ? "Working…" : `Transfer ${selectedIds.length || ""} contact${selectedIds.length === 1 ? "" : "s"}`}</Text></Pressable>
    </View>}
    {actionError && <Text style={styles.error}>{actionError}</Text>}
    <TextInput accessibilityLabel="Search this Preacher's contacts" value={search} onChangeText={setSearch} placeholder="Search this Preacher's contacts" placeholderTextColor={colors.muted} style={styles.search} />
    {loading && <LoadingState />}{error && <ErrorState message={error} onRetry={() => void reload()} />}
    {!loading && !error && customers.length === 0 && <EmptyState title={search ? "No matching contacts" : "No assigned contacts"} detail={search ? "Try a different name or phone number." : "This Preacher does not currently own any customer contacts."} />}
    {customers.map((customer) => <View key={customer.id} style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selectedIds.includes(customer.id) }} onPress={() => toggleCustomer(customer.id)} style={selectedIds.includes(customer.id) ? styles.checkboxChecked : styles.checkbox}><Text style={styles.checkmark}>{selectedIds.includes(customer.id) ? "✓" : ""}</Text></Pressable>
      <Link href={{ pathname: "/customer/[id]", params: { id: customer.id } }} asChild><Pressable style={styles.customerLink}><View style={styles.copy}><Text style={styles.name}>{customer.fullName}</Text><Text style={styles.detail}>{[customer.city, customer.mobileNumber].filter(Boolean).join(" · ")}</Text>{customer.status === "OUT_OF_SERVICE" && <Text style={styles.status}>OUT OF SERVICE</Text>}</View><Text style={styles.chevron}>›</Text></Pressable></Link>
    </View>)}
    {data && <Pressable disabled={busy} onPress={() => void confirmRemoval()} style={styles.removeButton}><Text style={styles.removeText}>Remove this Preacher</Text></Pressable>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingBottom: 50 },
  managerCard: { backgroundColor: colors.navy, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md }, managerName: { color: colors.white, fontWeight: "800", fontSize: 19 }, managerEmail: { color: colors.blueGrey, marginTop: 4 }, managerRole: { color: colors.goldLight, fontSize: 11, fontWeight: "800", marginTop: 8 },
  transferCard: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md }, transferHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, transferTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" }, transferHelp: { color: colors.muted, fontSize: 12, marginTop: 5 }, textAction: { color: colors.goldDark, fontWeight: "800" }, managerChoices: { gap: 8, paddingVertical: 12 }, managerChoice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, managerChoiceActive: { borderWidth: 1, borderColor: colors.navy, backgroundColor: colors.navy, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, managerChoiceText: { color: colors.ink, fontWeight: "700", fontSize: 12 }, managerChoiceTextActive: { color: colors.white, fontWeight: "700", fontSize: 12 },
  primary: { backgroundColor: colors.navy, borderRadius: radii.sm, minHeight: 44, alignItems: "center", justifyContent: "center" }, primaryDisabled: { backgroundColor: colors.blueGrey, borderRadius: radii.sm, minHeight: 44, alignItems: "center", justifyContent: "center" }, primaryText: { color: colors.white, fontWeight: "800" },
  error: { color: "#9B2C2C", backgroundColor: colors.rosePale, borderRadius: radii.sm, padding: 12, marginBottom: spacing.md }, search: { height: 50, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radii.md, paddingLeft: spacing.md, marginBottom: 10 }, checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.blueGrey, alignItems: "center", justifyContent: "center" }, checkboxChecked: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.navy, borderWidth: 2, borderColor: colors.navy, alignItems: "center", justifyContent: "center" }, checkmark: { color: colors.white, fontWeight: "900" }, customerLink: { flex: 1, flexDirection: "row", alignItems: "center", padding: spacing.md }, copy: { flex: 1 }, name: { color: colors.ink, fontWeight: "800" }, detail: { color: colors.muted, fontSize: 12, marginTop: 4 }, status: { color: "#9B2C2C", fontSize: 10, fontWeight: "900", marginTop: 5 }, chevron: { color: colors.navy, fontSize: 25 },
  removeButton: { borderWidth: 1, borderColor: "#B54747", borderRadius: radii.md, alignItems: "center", padding: 14, marginTop: spacing.lg }, removeText: { color: "#9B2C2C", fontWeight: "800" }
});
