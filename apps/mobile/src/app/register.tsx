import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { Field, FormMessage, PrimaryButton } from "@/components/form-controls";
import { colors, radii, spacing } from "@/constants/design";
import { ApiError } from "@/lib/api-client";

export default function RegisterScreen() {
  const { register } = useAuth(); const [fullName, setFullName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit() { if (!fullName.trim() || !email.trim() || password.length < 12) return setError("Enter your name, a valid email, and a password of at least 12 characters."); setLoading(true); setError(null); setMessage(null); try { setMessage(await register({ fullName, email, password })); } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Could not create your account."); } finally { setLoading(false); } }
  return <View style={styles.screen}><View style={styles.roleBadge}><Text style={styles.roleBadgeText}>PREACHER REGISTRATION</Text></View><FormMessage message={error} /><FormMessage message={message} tone="success" /><Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" /><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /><Field label="Password (minimum 12 characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" /><PrimaryButton label="Submit for approval" loading={loading} onPress={() => void submit()} />{message && <Pressable onPress={() => router.replace("/login")}><Text style={styles.login}>Return to sign in</Text></Pressable>}<Text style={styles.note}>For security, a Super Admin must approve every Preacher account before its first login.</Text></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: spacing.lg, backgroundColor: colors.canvas }, roleBadge: { alignSelf: "center", backgroundColor: colors.goldPale, borderColor: colors.gold, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 8, marginBottom: spacing.lg }, roleBadgeText: { color: colors.navy, fontWeight: "900", fontSize: 11, letterSpacing: 1 }, login: { color: colors.goldDark, fontWeight: "800", textAlign: "center", marginTop: spacing.lg }, note: { color: colors.muted, textAlign: "center", lineHeight: 19, marginTop: spacing.lg } });
