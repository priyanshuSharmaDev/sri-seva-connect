import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/design";

export function SectionHeading({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return <View style={styles.row}><Text style={styles.title}>{title}</Text>{actionLabel && <Text style={styles.action}>{actionLabel}</Text>}</View>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 2 }, title: { color: colors.ink, fontSize: 17, fontWeight: "800" }, action: { color: colors.goldDark, fontSize: 12, fontWeight: "700" } });
