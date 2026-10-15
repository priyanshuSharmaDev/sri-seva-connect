import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@/constants/design";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <View style={styles.state}><ActivityIndicator color={colors.goldDark} /><Text style={styles.text}>{label}</Text></View>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.card}><Text style={styles.title}>{title}</Text><Text style={styles.text}>{detail}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={styles.card}><Text style={styles.title}>Could not load data</Text><Text style={styles.text}>{message}</Text><Pressable onPress={onRetry} style={styles.button}><Text style={styles.buttonText}>Try again</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  state: { padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.lg, alignItems: "center" },
  title: { color: colors.ink, fontWeight: "800", fontSize: 16, textAlign: "center" },
  text: { color: colors.muted, lineHeight: 20, marginTop: spacing.sm, textAlign: "center" },
  button: { backgroundColor: colors.navy, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 10, marginTop: spacing.md },
  buttonText: { color: colors.white, fontWeight: "700" }
});
