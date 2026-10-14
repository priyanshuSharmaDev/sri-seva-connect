import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing } from "@/constants/design";
import { customers } from "@/data/demo";

export default function CustomersScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput accessibilityLabel="Search customers" placeholder="Search name or phone" placeholderTextColor={colors.muted} style={styles.search} />
        <View style={styles.metaRow}><Text style={styles.meta}>{customers.length} assigned customers</Text><Text style={styles.sync}>● Synced</Text></View>
        {customers.map((customer) => (
          <Link key={customer.id} href={{ pathname: "/customer/[id]", params: { id: customer.id } }} asChild>
            <Pressable accessibilityRole="button" style={styles.customerRow}>
              <View style={styles.avatar}><Text style={styles.initials}>{customer.initials}</Text></View>
              <View style={styles.customerCopy}>
                <Text style={styles.name}>{customer.name}</Text>
                <Text style={styles.detail}>{customer.city} · {customer.language}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg },
  search: { height: 50, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: spacing.md }, meta: { color: colors.muted, fontSize: 12 }, sync: { color: colors.sage, fontSize: 12, fontWeight: "700" },
  customerRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.warm, alignItems: "center", justifyContent: "center" }, initials: { color: colors.navy, fontWeight: "800" },
  customerCopy: { flex: 1, paddingHorizontal: 13 }, name: { color: colors.ink, fontWeight: "700", fontSize: 15 }, detail: { color: colors.muted, fontSize: 12, marginTop: 3 }, chevron: { color: colors.navy, fontSize: 25 }
});
