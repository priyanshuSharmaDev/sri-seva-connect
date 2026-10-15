import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-context";
import { ApiStatus } from "@/components/api-status";
import { colors, radii, spacing } from "@/constants/design";

export default function AccountScreen() { const { session, logout } = useAuth(); return <SafeAreaView style={styles.screen} edges={["bottom"]}><View style={styles.card}><Text style={styles.name}>{session?.user.fullName}</Text><Text style={styles.email}>{session?.user.email}</Text><Text style={styles.role}>{session?.membership.role.replaceAll("_", " ")}</Text><Text style={styles.org}>{session?.membership.organization.name}</Text><ApiStatus /></View><Pressable onPress={() => void logout()} style={styles.logout}><Text style={styles.logoutText}>Sign out</Text></Pressable></SafeAreaView>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg }, card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg }, name: { color: colors.ink, fontSize: 22, fontWeight: "800" }, email: { color: colors.muted, marginTop: 4 }, role: { color: colors.goldDark, fontWeight: "800", marginTop: spacing.lg }, org: { color: colors.muted, marginTop: 4, marginBottom: spacing.md }, logout: { borderWidth: 1, borderColor: colors.navy, borderRadius: radii.md, minHeight: 50, justifyContent: "center", alignItems: "center", marginTop: spacing.lg }, logoutText: { color: colors.navy, fontWeight: "800" } });
