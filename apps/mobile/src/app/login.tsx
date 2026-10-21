import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { AuthShell } from "@/components/auth-shell";
import { Field, FormMessage, PrimaryButton } from "@/components/form-controls";
import { colors, spacing } from "@/constants/design";
import { ApiError } from "@/lib/api-client";

export default function LoginScreen() {
  const { login } = useAuth(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit() { if (!email.trim() || !password) return setError("Email and password are required."); setLoading(true); setError(null); try { await login(email, password); } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Could not sign in. Please try again."); } finally { setLoading(false); } }
  return <AuthShell title="Welcome back" subtitle="Remember, connect and care for every relationship with seva-bhava."><FormMessage message={error} /><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" /><PrimaryButton label="Sign in" loading={loading} onPress={() => void submit()} /><Text style={styles.prompt}>New Preacher?</Text><Link href="/register" asChild><Pressable><Text style={styles.link}>Create an account</Text></Pressable></Link></AuthShell>;
}
const styles = StyleSheet.create({ prompt: { color: colors.muted, textAlign: "center", marginTop: spacing.lg }, link: { color: colors.goldDark, fontWeight: "800", textAlign: "center", marginTop: 5 } });
