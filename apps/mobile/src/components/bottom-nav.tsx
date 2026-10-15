import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/design";

type NavKey = "today" | "customers" | "account";
const items = [
  { key: "today" as const, label: "Today", symbol: "⌂", href: "/" as const },
  { key: "customers" as const, label: "Customers", symbol: "◎", href: "/customers" as const },
  { key: "account" as const, label: "Account", symbol: "●", href: "/explore" as const }
];

export function BottomNav({ active }: { active: NavKey }) {
  return (
    <View style={styles.nav}>
      {items.map((item) => (
        <Link href={item.href} asChild key={item.key}>
          <Pressable accessibilityRole="button" style={styles.item}>
            <Text style={[styles.symbol, active === item.key && styles.active]}>{item.symbol}</Text>
            <Text style={[styles.label, active === item.key && styles.active]}>{item.label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 78, backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, flexDirection: "row", paddingBottom: 7 },
  item: { flex: 1, alignItems: "center", justifyContent: "center" }, symbol: { color: colors.muted, fontWeight: "800", fontSize: 18 }, label: { color: colors.muted, fontSize: 10, fontWeight: "600", marginTop: 4 }, active: { color: colors.navy }
});
