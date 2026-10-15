import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/design";
import { getApiReadiness } from "@/lib/api-client";

type ConnectionState = "checking" | "connected" | "unavailable";

export function ApiStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("checking");

  useEffect(() => {
    let isMounted = true;

    getApiReadiness()
      .then(({ status }) => {
        if (isMounted) setConnectionState(status === "ready" ? "connected" : "unavailable");
      })
      .catch(() => {
        if (isMounted) setConnectionState("unavailable");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const label = connectionState === "connected"
    ? "Live backend connected"
    : connectionState === "checking"
      ? "Connecting to live backend…"
      : "Backend temporarily unavailable";

  return (
    <View accessible accessibilityLabel={label} accessibilityLiveRegion="polite" style={styles.row}>
      <View style={[styles.dot, connectionState === "connected" && styles.connected, connectionState === "unavailable" && styles.unavailable]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", marginTop: 8 },
  dot: { backgroundColor: colors.gold, borderRadius: 4, height: 7, marginRight: 7, width: 7 },
  connected: { backgroundColor: colors.sage },
  unavailable: { backgroundColor: "#D97706" },
  label: { color: colors.blueGrey, fontSize: 11, fontWeight: "600" }
});
