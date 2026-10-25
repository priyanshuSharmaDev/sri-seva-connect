import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { colors, radii, spacing } from "@/constants/design";

export function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline && styles.multiline, props.style]} /></View>;
}

export function PasswordField({ label, value, onChangeText, autoComplete = "new-password" }: { label: string; value: string; onChangeText: (value: string) => void; autoComplete?: ComponentProps<typeof TextInput>["autoComplete"] }) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.passwordInputRow}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholderTextColor={colors.muted} secureTextEntry={!visible} autoCapitalize="none" autoComplete={autoComplete} style={styles.passwordInput} />
      <Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide password" : "Show password"} accessibilityState={{ selected: visible }} onPress={() => setVisible((current) => !current)} hitSlop={8} style={styles.passwordToggle}>
        <Text style={styles.passwordEye}>{visible ? "◉" : "◎"}</Text>
      </Pressable>
    </View>
  </View>;
}

export function PrimaryButton({ label, loading = false, ...props }: { label: string; loading?: boolean } & ComponentProps<typeof Pressable>) {
  return <Pressable accessibilityRole="button" disabled={loading || props.disabled} {...props} style={({ pressed }) => [styles.button, pressed && styles.pressed, (loading || props.disabled) && styles.disabled]}>{loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{label}</Text>}</Pressable>;
}

export function FormMessage({ message, tone = "error" }: { message?: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return <Text accessibilityRole="alert" style={[styles.message, tone === "success" && styles.success]}>{message}</Text>;
}

const styles = StyleSheet.create({ field: { marginBottom: 14 }, label: { color: colors.ink, fontWeight: "700", fontSize: 12, marginBottom: 6 }, input: { minHeight: 49, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, paddingHorizontal: 13, color: colors.ink, backgroundColor: colors.white }, passwordInputRow: { minHeight: 49, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, backgroundColor: colors.white }, passwordInput: { flex: 1, minHeight: 48, paddingHorizontal: 13, color: colors.ink }, passwordToggle: { minWidth: 48, minHeight: 46, alignItems: "center", justifyContent: "center" }, passwordEye: { color: colors.navy, fontSize: 20, fontWeight: "800" }, busyLabel: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, multiline: { minHeight: 92, paddingTop: 13, textAlignVertical: "top" }, button: { minHeight: 50, borderRadius: radii.sm, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md }, buttonText: { color: colors.white, fontWeight: "800" }, pressed: { opacity: 0.86 }, disabled: { opacity: 0.55 }, message: { color: "#A12A2A", lineHeight: 19, marginBottom: spacing.md, fontWeight: "600" }, success: { color: colors.sage } });
