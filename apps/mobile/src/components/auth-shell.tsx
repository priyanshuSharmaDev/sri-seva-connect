import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark, SpiritualAccent } from "@/components/brand-mark";
import { colors, radii, shadow, spacing } from "@/constants/design";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.brand}><BrandMark /></View><Text style={styles.appName}>SRI SEVA CONNECT</Text><SpiritualAccent light /><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text><View style={styles.card}>{children}</View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: colors.navy }, content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg }, brand: { alignItems: "center", alignSelf: "center" }, appName: { color: colors.goldLight, letterSpacing: 2, fontWeight: "800", fontSize: 12, textAlign: "center", marginTop: spacing.md, marginBottom: spacing.sm }, title: { color: colors.white, fontWeight: "800", fontSize: 27, textAlign: "center", marginTop: spacing.lg }, subtitle: { color: colors.blueGrey, textAlign: "center", lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.lg }, card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, borderTopWidth: 3, borderTopColor: colors.saffron, ...shadow } });
