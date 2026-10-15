import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing } from "@/constants/design";

export function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline && styles.multiline, props.style]} /></View>;
}

export function PrimaryButton({ label, loading = false, ...props }: { label: string; loading?: boolean } & ComponentProps<typeof Pressable>) {
  return <Pressable accessibilityRole="button" disabled={loading || props.disabled} {...props} style={({ pressed }) => [styles.button, pressed && styles.pressed, (loading || props.disabled) && styles.disabled]}>{loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{label}</Text>}</Pressable>;
}

export function FormMessage({ message, tone = "error" }: { message?: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return <Text accessibilityRole="alert" style={[styles.message, tone === "success" && styles.success]}>{message}</Text>;
}

const styles = StyleSheet.create({ field: { marginBottom: 14 }, label: { color: colors.ink, fontWeight: "700", fontSize: 12, marginBottom: 6 }, input: { minHeight: 49, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, paddingHorizontal: 13, color: colors.ink, backgroundColor: colors.white }, multiline: { minHeight: 92, paddingTop: 13, textAlignVertical: "top" }, button: { minHeight: 50, borderRadius: radii.sm, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md }, buttonText: { color: colors.white, fontWeight: "800" }, pressed: { opacity: 0.86 }, disabled: { opacity: 0.55 }, message: { color: "#A12A2A", lineHeight: 19, marginBottom: spacing.md, fontWeight: "600" }, success: { color: colors.sage } });
