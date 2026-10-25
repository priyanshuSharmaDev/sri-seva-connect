import { Link } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/design";

type NavKey = "today" | "customers" | "account";
const items = [
  { key: "today" as const, label: "Today", icon: "calendar-heart" as const, href: "/" as const },
  { key: "customers" as const, label: "Customers", icon: "account-multiple-outline" as const, href: "/customers" as const },
  { key: "account" as const, label: "Account", icon: "account-circle-outline" as const, href: "/explore" as const }
];

export function BottomNav({ active }: { active: NavKey }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { minHeight: 58 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {items.map((item) => (
        <Link href={item.href} asChild key={item.key}>
          <Pressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active === item.key }} style={styles.item}>
            <MaterialCommunityIcons name={item.icon} size={23} color={active === item.key ? colors.goldDark : colors.muted} accessibilityElementsHidden />
            <Text style={[styles.label, active === item.key && styles.active]}>{item.label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { width: "100%", backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, flexDirection: "row", paddingTop: 6 },
  item: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 3 }, label: { color: colors.muted, fontSize: 11, fontWeight: "600" }, active: { color: colors.navy, fontWeight: "800" }
});
