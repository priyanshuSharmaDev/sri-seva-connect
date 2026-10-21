import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-context";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { colors, radii, shadow, spacing } from "@/constants/design";
import { useApiResource } from "@/hooks/use-api-resource";
import { ApiError } from "@/lib/api-client";
import { confirmAction } from "@/lib/confirm-action";
import { phoneUrl, smsUrl, whatsappUrl } from "@/lib/contact-links";
import type { CustomerDetail, CustomerStatus, ManagerSummary } from "@/types/api";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request, session } = useAuth();
  const isSuperAdmin = session?.membership.role === "SUPER_ADMIN";
  const path = `/v1/customers/${id}` as const;
  const { data, loading, error, reload } = useApiResource<{ data: CustomerDetail }>(path);
  const managersResource = useApiResource<{ managers: ManagerSummary[] }>(isSuperAdmin ? "/v1/admin/managers" : null);
  const [busy, setBusy] = useState(false);
  const [transferToId, setTransferToId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const customer = data?.data;
  if (loading) return <LoadingState label="Loading customer…" />;
  if (error || !customer) return <ErrorState message={error ?? "Customer not found"} onRetry={() => void reload()} />;
  const followUps = customer.followUpSeries ?? [];
  const isActive = customer.status === "ACTIVE";

  async function updateStatus(status: CustomerStatus) {
    setBusy(true);
    setActionError(null);
    try {
      await request(`/v1/customers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await reload();
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : "Could not update customer status.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    const confirmed = await confirmAction("Delete customer?", "The customer will disappear from active lists. Their history remains preserved for audit and recovery.", "Delete");
    if (confirmed) await deleteCustomer();
  }

  async function deleteCustomer() {
    setBusy(true);
    setActionError(null);
    try {
      await request(`/v1/customers/${id}`, { method: "DELETE" });
      router.back();
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : "Could not delete this customer.");
      setBusy(false);
    }
  }

  async function transferCustomer() {
    if (!transferToId) return;
    setBusy(true);
    setActionError(null);
    try {
      await request(`/v1/customers/${id}/transfer`, { method: "POST", body: JSON.stringify({ managerId: transferToId }) });
      setTransferToId(null);
      await Promise.all([reload(), managersResource.reload()]);
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : "Could not transfer this contact.");
    } finally {
      setBusy(false);
    }
  }

  return <SafeAreaView style={styles.safeArea} edges={["bottom"]}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.identity}><View style={styles.avatar}><Text style={styles.initials}>{initials(customer.fullName)}</Text></View><Text style={styles.name}>{customer.fullName}</Text><Text style={styles.meta}>{[customer.city, customer.preferredLanguage, customer.mobileNumber].filter(Boolean).join(" · ")}</Text><View style={isActive ? styles.activeBadge : styles.inactiveBadge}><Text style={isActive ? styles.activeBadgeText : styles.inactiveBadgeText}>{isActive ? "ACTIVE" : "OUT OF SERVICE"}</Text></View></View>
    {isActive && <View style={styles.actionRow}>{customer.allowPhone && <Action label="Call" symbol="☎" onPress={() => void Linking.openURL(phoneUrl(customer.mobileNumber))} />}{customer.allowWhatsapp && <Action label="WhatsApp" symbol="W" onPress={() => void Linking.openURL(whatsappUrl(customer.mobileNumber))} />}{customer.allowSms && <Action label="SMS" symbol="✉" onPress={() => void Linking.openURL(smsUrl(customer.mobileNumber))} />}</View>}
    {!isActive && <Text style={styles.inactiveNotice}>Contact reminders and recurring follow-ups are paused for this customer.</Text>}
    <Link href={{ pathname: "/customer/edit", params: { id } }} asChild><Pressable style={styles.editButton}><Text style={styles.editButtonText}>Update customer details</Text><Text style={styles.editArrow}>→</Text></Pressable></Link>
    {isSuperAdmin && <View style={styles.transferCard}><Text style={styles.transferTitle}>Assign to any Preacher</Text><Text style={styles.transferHint}>Choose any active Preacher. This does not need to be a newly approved account.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.preacherChoices}>{(managersResource.data?.managers ?? []).filter((preacher) => preacher.id !== customer.assignedManagerId).map((preacher) => <Pressable key={preacher.id} onPress={() => setTransferToId(preacher.id)} style={transferToId === preacher.id ? styles.preacherChoiceActive : styles.preacherChoice}><Text style={transferToId === preacher.id ? styles.preacherChoiceTextActive : styles.preacherChoiceText}>{preacher.user.fullName}</Text></Pressable>)}</ScrollView><Pressable disabled={busy || !transferToId} onPress={() => void transferCustomer()} style={busy || !transferToId ? styles.transferButtonDisabled : styles.transferButton}><Text style={styles.transferButtonText}>{busy ? "Working…" : "Transfer contact"}</Text></Pressable></View>}
    {actionError && <Text style={styles.error}>{actionError}</Text>}
    <View style={styles.lifecycleRow}><Pressable disabled={busy} onPress={() => void updateStatus(isActive ? "OUT_OF_SERVICE" : "ACTIVE")} style={styles.statusButton}><Text style={styles.statusButtonText}>{busy ? "Working…" : isActive ? "Mark out of service" : "Restore active status"}</Text></Pressable>{isSuperAdmin && <Pressable disabled={busy} onPress={() => void confirmDelete()} style={styles.deleteButton}><Text style={styles.deleteButtonText}>Delete customer</Text></Pressable>}</View>
    <Section title="Important occasions">{customer.occasions.length ? customer.occasions.map((item) => <InfoRow key={item.id} title={item.title} detail={`${item.day}/${item.month}${item.year ? `/${item.year}` : ""} · ${item.kind.replaceAll("_", " ")}`} />) : <InfoRow title="No occasions recorded" detail="Occasions added for this customer will appear here." />}</Section>
    <Section title="Family">{customer.familyMembers.length ? customer.familyMembers.map((item) => <InfoRow key={item.id} title={item.name} detail={`${item.customRelationship ?? item.relationship}${item.phoneNumber ? ` · ${item.phoneNumber}` : ""}`} />) : <InfoRow title="No family members recorded" detail="Family details have not been added yet." />}</Section>
    <Section title="Contact frequency">{followUps.length ? followUps.map((item) => <InfoRow key={item.id} title={formatCadence(item.cadence, item.customIntervalMinutes)} detail={`Next follow-up: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.nextOccurrenceAt))}`} />) : <InfoRow title="No recurring follow-up" detail={isActive ? "A contact frequency was not selected for this customer." : "Follow-ups were stopped when this customer was marked out of service."} />}</Section>
    {(customer.profession || customer.company || customer.email || customer.notes) && <Section title="Profile"><InfoRow title={customer.profession ?? "Profile details"} detail={[customer.company, customer.email, customer.notes].filter(Boolean).join(" · ")} /></Section>}
  </ScrollView></SafeAreaView>;
}

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function formatCadence(cadence: string, customIntervalMinutes: number | null) { if (cadence === "CUSTOM" && customIntervalMinutes) return `Every ${Math.round(customIntervalMinutes / 1440)} days`; return cadence.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
function Action({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.action}><Text style={styles.actionSymbol}>{symbol}</Text><Text style={styles.actionLabel}>{label}</Text></Pressable>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionCard}>{children}</View></View>; }
function InfoRow({ title, detail }: { title: string; detail: string }) { return <View style={styles.infoRow}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDetail}>{detail}</Text></View>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingBottom: 50 }, identity: { alignItems: "center", paddingVertical: spacing.lg }, avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldPale, alignItems: "center", justifyContent: "center", marginBottom: 12 }, initials: { color: colors.navy, fontWeight: "800", fontSize: 22 }, name: { color: colors.ink, fontSize: 23, fontWeight: "800" }, meta: { color: colors.muted, marginTop: 5, textAlign: "center" },
  activeBadge: { backgroundColor: colors.sagePale, borderRadius: 999, marginTop: 10, paddingHorizontal: 10, paddingVertical: 5 }, inactiveBadge: { backgroundColor: colors.rosePale, borderRadius: 999, marginTop: 10, paddingHorizontal: 10, paddingVertical: 5 }, activeBadgeText: { color: colors.sage, fontSize: 10, fontWeight: "900" }, inactiveBadgeText: { color: "#9B2C2C", fontSize: 10, fontWeight: "900" }, inactiveNotice: { color: "#7C3E3E", backgroundColor: colors.rosePale, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, lineHeight: 19 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: spacing.md }, action: { flex: 1, backgroundColor: colors.white, borderRadius: radii.md, paddingVertical: 13, alignItems: "center", ...shadow }, actionSymbol: { color: colors.navy, fontSize: 20 }, actionLabel: { color: colors.navy, fontWeight: "700", fontSize: 12, marginTop: 5 }, editButton: { borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.goldPale, borderRadius: radii.md, padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }, editButtonText: { color: colors.navy, fontWeight: "800" }, editArrow: { color: colors.goldDark, fontSize: 20 },
  transferCard: { backgroundColor: colors.white, borderRadius: radii.md, borderTopWidth: 3, borderTopColor: colors.peacock, padding: spacing.md, marginBottom: spacing.md }, transferTitle: { color: colors.ink, fontWeight: "800", fontSize: 16 }, transferHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }, preacherChoices: { gap: 8, paddingVertical: 12 }, preacherChoice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, preacherChoiceActive: { borderWidth: 1, borderColor: colors.peacockDeep, backgroundColor: colors.peacockDeep, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, preacherChoiceText: { color: colors.ink, fontWeight: "700", fontSize: 12 }, preacherChoiceTextActive: { color: colors.white, fontWeight: "700", fontSize: 12 }, transferButton: { backgroundColor: colors.peacockDeep, borderRadius: radii.sm, minHeight: 44, alignItems: "center", justifyContent: "center" }, transferButtonDisabled: { backgroundColor: colors.blueGrey, borderRadius: radii.sm, minHeight: 44, alignItems: "center", justifyContent: "center" }, transferButtonText: { color: colors.white, fontWeight: "800" },
  error: { color: "#9B2C2C", backgroundColor: colors.rosePale, borderRadius: radii.sm, padding: 12, marginBottom: spacing.md }, lifecycleRow: { flexDirection: "row", gap: 10 }, statusButton: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: colors.goldDark, borderRadius: radii.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, statusButtonText: { color: colors.goldDark, fontWeight: "800", textAlign: "center", fontSize: 12 }, deleteButton: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: "#B54747", borderRadius: radii.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, deleteButtonText: { color: "#9B2C2C", fontWeight: "800", textAlign: "center", fontSize: 12 },
  section: { marginTop: spacing.md }, sectionTitle: { color: colors.ink, fontWeight: "800", fontSize: 16, marginBottom: 10 }, sectionCard: { backgroundColor: colors.white, borderRadius: radii.lg, overflow: "hidden" }, infoRow: { minHeight: 66, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, infoTitle: { color: colors.ink, fontWeight: "700" }, infoDetail: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }
});
