import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
    setActionError(null);
    try {
      const destination = destinations.find((manager) => manager.id === destinationId);
      const confirmed = await confirmAction(
        "Transfer selected contacts?",
        `${selectedIds.length} contact${selectedIds.length === 1 ? "" : "s"} will move from ${data?.manager.user.fullName ?? "this Preacher"} to ${destination?.user.fullName ?? "the selected Preacher"}. Their family details, occasions, notes, history and pending reminders will stay with the contacts.`,
        "Transfer contacts"
      );
      if (!confirmed) return;
      setBusy(true);
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
      <View style={styles.transferHeading}><View style={styles.transferTitleRow}><View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View><Text style={styles.transferTitle}>Choose contacts</Text></View><Pressable onPress={() => { const visibleIds = customers.map(({ id: customerId }) => customerId); const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((customerId) => selectedIds.includes(customerId)); setSelectedIds((current) => allVisibleSelected ? current.filter((customerId) => !visibleIds.includes(customerId)) : [...new Set([...current, ...visibleIds])]); }}><Text style={styles.textAction}>{customers.length > 0 && customers.every(({ id: customerId }) => selectedIds.includes(customerId)) ? "Clear visible" : "Select visible"}</Text></Pressable></View>
      <Text style={styles.transferHelp}>{selectedIds.length} selected from {data.customers.length} assigned contacts</Text>
      <View style={[styles.transferTitleRow, styles.destinationHeading]}><View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View><Text style={styles.transferTitle}>Choose receiving Preacher</Text></View>
      {managersResource.loading && <LoadingState label="Loading active Preachers…" />}
      {managersResource.error && <ErrorState message={managersResource.error} onRetry={() => void managersResource.reload()} />}
      {!managersResource.loading && !managersResource.error && destinations.length === 0 && <Text style={styles.noDestination}>No other active Preachers are available to receive these contacts.</Text>}
      <View style={styles.managerChoices}>{destinations.map((manager) => <Pressable key={manager.id} accessibilityRole="radio" accessibilityState={{ selected: destinationId === manager.id }} onPress={() => setDestinationId(manager.id)} style={[styles.managerChoice, destinationId === manager.id && styles.managerChoiceActive]}><View style={styles.managerCopy}><Text style={styles.managerChoiceName}>{manager.user.fullName}</Text><Text style={styles.managerChoiceMeta}>{manager._count.assignedCustomers} assigned contacts</Text></View><View style={destinationId === manager.id ? styles.radioSelected : styles.radio} /></Pressable>)}</View>
      {destinationId && selectedIds.length > 0 && <Text style={styles.transferSummary}>{selectedIds.length} contact{selectedIds.length === 1 ? "" : "s"} → {destinations.find((manager) => manager.id === destinationId)?.user.fullName}</Text>}
      <Pressable disabled={busy || !destinationId || selectedIds.length === 0 || managersResource.loading || Boolean(managersResource.error)} onPress={() => void transferSelected()} style={busy || !destinationId || selectedIds.length === 0 || managersResource.loading || managersResource.error ? styles.primaryDisabled : styles.primary}>{busy ? <View style={styles.busyLabel}><ActivityIndicator size="small" color={colors.white} /><Text style={styles.primaryText}>Transferring contacts…</Text></View> : <Text style={styles.primaryText}>Transfer {selectedIds.length || "selected"} contact{selectedIds.length === 1 ? "" : "s"}</Text>}</Pressable>
    </View>}
    {actionError && <Text style={styles.error}>{actionError}</Text>}
    <TextInput accessibilityLabel="Search this Preacher's contacts" value={search} onChangeText={setSearch} placeholder="Search this Preacher's contacts" placeholderTextColor={colors.muted} style={styles.search} />
    {loading && <LoadingState />}{error && <ErrorState message={error} onRetry={() => void reload()} />}
    {!loading && !error && customers.length === 0 && <EmptyState title={search ? "No matching contacts" : "No assigned contacts"} detail={search ? "Try a different name or phone number." : "This Preacher does not currently own any customer contacts."} />}
    {customers.map((customer) => <View key={customer.id} style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selectedIds.includes(customer.id) }} onPress={() => toggleCustomer(customer.id)} style={selectedIds.includes(customer.id) ? styles.checkboxChecked : styles.checkbox}><Text style={styles.checkmark}>{selectedIds.includes(customer.id) ? "✓" : ""}</Text></Pressable>
      <Link href={{ pathname: "/customer/[id]", params: { id: customer.id } }} asChild><Pressable style={styles.customerLink}><View style={styles.copy}><Text style={styles.name}>{customer.fullName}</Text><Text style={styles.detail}>{[customer.city, customer.mobileNumber].filter(Boolean).join(" · ")}</Text>{customer.status === "OUT_OF_SERVICE" && <Text style={styles.status}>OUT OF SERVICE</Text>}</View><Text style={styles.chevron}>›</Text></Pressable></Link>
    </View>)}
    {data && <Pressable disabled={busy} onPress={() => void confirmRemoval()} style={styles.removeButton}>{busy ? <View style={styles.removeBusy}><ActivityIndicator size="small" color="#9B2C2C" /><Text style={styles.removeText}>Working…</Text></View> : <Text style={styles.removeText}>Remove this Preacher</Text>}</Pressable>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingBottom: 50 },
  managerCard: { backgroundColor: colors.navy, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md }, managerName: { color: colors.white, fontWeight: "800", fontSize: 19 }, managerEmail: { color: colors.blueGrey, marginTop: 4 }, managerRole: { color: colors.goldLight, fontSize: 11, fontWeight: "800", marginTop: 8 },
  transferCard: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, borderTopWidth: 3, borderTopColor: colors.peacock }, transferHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, transferTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 }, transferTitle: { color: colors.ink, fontSize: 15, fontWeight: "800", flexShrink: 1 }, stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.goldPale, alignItems: "center", justifyContent: "center" }, stepBadgeText: { color: colors.navy, fontSize: 12, fontWeight: "900" }, transferHelp: { color: colors.muted, fontSize: 12, marginTop: 7, marginLeft: 35 }, textAction: { color: colors.goldDark, fontWeight: "800", fontSize: 12 }, destinationHeading: { marginTop: spacing.lg, marginBottom: spacing.sm }, managerChoices: { gap: 8, paddingBottom: 12 }, managerChoice: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", alignItems: "center", backgroundColor: colors.canvas }, managerChoiceActive: { borderColor: colors.peacock, backgroundColor: colors.sagePale }, managerCopy: { flex: 1 }, managerChoiceName: { color: colors.ink, fontWeight: "800", fontSize: 13 }, managerChoiceMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.blueGrey }, radioSelected: { width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: colors.peacock }, noDestination: { color: colors.muted, backgroundColor: colors.canvas, borderRadius: radii.sm, padding: spacing.md, marginVertical: spacing.sm, fontSize: 12, lineHeight: 18 }, transferSummary: { color: colors.peacockDeep, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 8 }, busyLabel: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primary: { backgroundColor: colors.navy, borderRadius: radii.sm, minHeight: 44, alignItems: "center", justifyContent: "center" }, primaryDisabled: { backgroundColor: colors.blueGrey, borderRadius: radii.sm, minHeight: 44, alignItems: "center", justifyContent: "center" }, primaryText: { color: colors.white, fontWeight: "800" },
  error: { color: "#9B2C2C", backgroundColor: colors.rosePale, borderRadius: radii.sm, padding: 12, marginBottom: spacing.md }, search: { height: 50, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radii.md, paddingLeft: spacing.md, marginBottom: 10 }, checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.blueGrey, alignItems: "center", justifyContent: "center" }, checkboxChecked: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.navy, borderWidth: 2, borderColor: colors.navy, alignItems: "center", justifyContent: "center" }, checkmark: { color: colors.white, fontWeight: "900" }, customerLink: { flex: 1, flexDirection: "row", alignItems: "center", padding: spacing.md }, copy: { flex: 1 }, name: { color: colors.ink, fontWeight: "800" }, detail: { color: colors.muted, fontSize: 12, marginTop: 4 }, status: { color: "#9B2C2C", fontSize: 10, fontWeight: "900", marginTop: 5 }, chevron: { color: colors.navy, fontSize: 25 },
  removeButton: { borderWidth: 1, borderColor: "#B54747", borderRadius: radii.md, alignItems: "center", padding: 14, marginTop: spacing.lg }, removeBusy: { flexDirection: "row", alignItems: "center", gap: 8 }, removeText: { color: "#9B2C2C", fontWeight: "800" }
});
