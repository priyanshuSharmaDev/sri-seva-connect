import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadow, spacing } from "@/constants/design";
import type { DashboardOccasion } from "@/types/api";

export function OccasionCard({ occasion }: { occasion: DashboardOccasion }) {
  const phone = occasion.customer.mobileNumber.replace(/\D/g, "");
  const displayName = occasion.familyMember?.name ?? occasion.customer.fullName;
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <View style={styles.card}>
      <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
      <View style={styles.copy}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.detail}>{occasion.title}</Text>
        {occasion.familyMember && <Text style={styles.note}>{occasion.familyMember.relationship} of {occasion.customer.fullName}</Text>}
      </View>
      <View style={styles.actions}>
        {occasion.customer.allowPhone && <Pressable accessibilityRole="button" accessibilityLabel={`Call ${displayName}`} onPress={() => void Linking.openURL(`tel:${occasion.customer.mobileNumber}`)} style={styles.action}><Text style={styles.actionText}>☎</Text></Pressable>}
        {occasion.customer.allowWhatsapp && <Pressable accessibilityRole="button" accessibilityLabel={`WhatsApp ${displayName}`} onPress={() => void Linking.openURL(`https://wa.me/${phone}`)} style={[styles.action, styles.whatsapp]}><Text style={styles.whatsappText}>W</Text></Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...shadow, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.warm, alignItems: "center", justifyContent: "center" }, initials: { color: colors.navy, fontWeight: "800" },
  copy: { flex: 1, paddingHorizontal: 12 }, name: { color: colors.ink, fontWeight: "800", fontSize: 15 }, detail: { color: colors.muted, fontSize: 12, marginTop: 3 }, note: { color: colors.goldDark, fontSize: 11, marginTop: 4, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 7 }, action: { width: 37, height: 37, borderRadius: 19, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, actionText: { color: colors.navy, fontSize: 16 }, whatsapp: { backgroundColor: colors.sagePale, borderColor: colors.sagePale }, whatsappText: { color: colors.sage, fontWeight: "900" }
});
