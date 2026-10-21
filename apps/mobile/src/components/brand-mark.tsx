import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/design";

const tilak = require("../../assets/images/gaudiya-tilak.png");

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 42 : 72;
  return (
    <View accessibilityLabel="Sri Seva Connect Gaudiya Vaishnava tilak" style={[styles.frame, { width: size, height: size }] }>
      <Image source={tilak} resizeMode="contain" style={{ width: size * 0.48, height: size * 0.7 }} />
    </View>
  );
}

export function SpiritualAccent({ light = false }: { light?: boolean }) {
  return (
    <View accessible={false} style={styles.accentRow}>
      <View style={[styles.line, light && styles.lineLight]} />
      <Text style={styles.lotus}>🪷</Text>
      <Text style={[styles.seva, light && styles.sevaLight]}>SEVA • SMARAN</Text>
      <Text style={styles.peacock}>🦚</Text>
      <View style={[styles.line, light && styles.lineLight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.peacockDeep,
    borderWidth: 1,
    borderColor: colors.goldLight
  },
  accentRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  line: { width: 24, height: 1, backgroundColor: colors.gold },
  lineLight: { backgroundColor: colors.goldLight },
  lotus: { fontSize: 13 },
  peacock: { fontSize: 13 },
  seva: { color: colors.goldDark, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  sevaLight: { color: colors.goldLight }
});
