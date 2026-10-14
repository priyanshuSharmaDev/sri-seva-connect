import type { ReactNode } from "react";
import { useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, shadow, spacing } from "@/constants/design";
import { customers } from "@/data/demo";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = customers.find((item) => item.id === id) ?? customers[0]!;
  const phone = customer.phone.replace(/\s/g, "");

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.initials}>{customer.initials}</Text></View>
          <Text style={styles.name}>{customer.name}</Text>
          <Text style={styles.meta}>{customer.city} · Prefers {customer.language}</Text>
        </View>
        <View style={styles.actionRow}>
          <Action label="Call" symbol="☎" onPress={() => void Linking.openURL(`tel:${phone}`)} />
          <Action label="WhatsApp" symbol="W" onPress={() => void Linking.openURL(`https://wa.me/${phone.replace("+", "")}`)} />
          <Action label="SMS" symbol="✉" onPress={() => void Linking.openURL(`sms:${phone}`)} />
        </View>

        <Section title="Important occasions">
          <InfoRow title="Birthday" detail="12 October · Today" accent />
          <InfoRow title="Wedding anniversary" detail="4 February · Remind 7 days before" />
        </Section>
        <Section title="Family">
          <InfoRow title="Priya Shah" detail="Spouse · Birthday 22 December" />
          <InfoRow title="Aarav Shah" detail="Son · Birthday 8 March" />
        </Section>
        <Section title="Recent interaction">
          <InfoRow title="Birthday call" detail="Last year · Warm conversation, asked about family" />
        </Section>
        <Pressable accessibilityRole="button" style={styles.followUpButton}><Text style={styles.followUpText}>+ Schedule a follow-up</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}><Text style={styles.actionSymbol}>{symbol}</Text><Text style={styles.actionLabel}>{label}</Text></Pressable>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionCard}>{children}</View></View>;
}

function InfoRow({ title, detail, accent = false }: { title: string; detail: string; accent?: boolean }) {
  return <View style={styles.infoRow}>{accent && <View style={styles.accentDot} />}<View style={styles.infoCopy}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDetail}>{detail}</Text></View></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingBottom: 50 },
  identity: { alignItems: "center", paddingVertical: spacing.lg }, avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldPale, alignItems: "center", justifyContent: "center", marginBottom: 12 }, initials: { color: colors.navy, fontWeight: "800", fontSize: 22 },
  name: { color: colors.ink, fontSize: 23, fontWeight: "800" }, meta: { color: colors.muted, marginTop: 5 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: spacing.lg }, action: { flex: 1, backgroundColor: colors.white, borderRadius: radii.md, paddingVertical: 13, alignItems: "center", ...shadow }, actionSymbol: { color: colors.navy, fontSize: 20 }, actionLabel: { color: colors.navy, fontWeight: "700", fontSize: 12, marginTop: 5 },
  section: { marginTop: spacing.md }, sectionTitle: { color: colors.ink, fontWeight: "800", fontSize: 16, marginBottom: 10 }, sectionCard: { backgroundColor: colors.white, borderRadius: radii.lg, overflow: "hidden" },
  infoRow: { minHeight: 66, paddingHorizontal: spacing.md, paddingVertical: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, accentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginRight: 10 }, infoCopy: { flex: 1 }, infoTitle: { color: colors.ink, fontWeight: "700" }, infoDetail: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  followUpButton: { borderWidth: 1, borderColor: colors.gold, borderRadius: radii.md, alignItems: "center", paddingVertical: 15, marginTop: spacing.xl }, followUpText: { color: colors.navy, fontWeight: "800" }
});
