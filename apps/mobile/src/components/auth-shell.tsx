import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadow, spacing } from "@/constants/design";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.brand}><Text style={styles.brandMark}>SSC</Text></View><Text style={styles.appName}>SRI SEVA CONNECT</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text><View style={styles.card}>{children}</View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: colors.navy }, content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg }, brand: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", alignSelf: "center" }, brandMark: { color: colors.navy, fontSize: 18, fontWeight: "900" }, appName: { color: colors.goldLight, letterSpacing: 2, fontWeight: "800", fontSize: 12, textAlign: "center", marginTop: spacing.md }, title: { color: colors.white, fontWeight: "800", fontSize: 27, textAlign: "center", marginTop: spacing.xl }, subtitle: { color: colors.blueGrey, textAlign: "center", lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.lg }, card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, ...shadow } });
