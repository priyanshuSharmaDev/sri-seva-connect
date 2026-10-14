import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing } from "@/constants/design";

const activities = [
  { initials: "RS", name: "Ravi Shah", detail: "WhatsApp · Birthday wishes sent", time: "10:42 AM" },
  { initials: "AK", name: "Ayesha Khan", detail: "Call · Follow-up scheduled", time: "Yesterday" },
  { initials: "MN", name: "Meera Nair", detail: "SMS · Anniversary wishes sent", time: "10 Oct" }
];

export default function ActivityScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>A private history of personal customer conversations.</Text>
        {activities.map((activity) => (
          <View key={`${activity.name}-${activity.time}`} style={styles.row}>
            <View style={styles.avatar}><Text style={styles.initials}>{activity.initials}</Text></View>
            <View style={styles.copy}><Text style={styles.name}>{activity.name}</Text><Text style={styles.detail}>{activity.detail}</Text></View>
            <Text style={styles.time}>{activity.time}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg },
  intro: { color: colors.muted, lineHeight: 21, marginBottom: spacing.lg },
  row: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldPale, alignItems: "center", justifyContent: "center" },
  initials: { color: colors.navy, fontWeight: "800" }, copy: { flex: 1, paddingHorizontal: 12 },
  name: { color: colors.ink, fontWeight: "700" }, detail: { color: colors.muted, fontSize: 12, marginTop: 3 }, time: { color: colors.muted, fontSize: 11 }
});
