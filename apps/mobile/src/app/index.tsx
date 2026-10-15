import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { ApiStatus } from "@/components/api-status";
import { OccasionCard } from "@/components/occasion-card";
import { SectionHeading } from "@/components/section-heading";
import { colors, radii, shadow, spacing } from "@/constants/design";
import { todayOccasions } from "@/data/demo";

export default function TodayScreen() {
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{dateLabel.toUpperCase()}</Text>
          <Text style={styles.greeting}>Good morning, Ananya</Text>
          <Text style={styles.subtitle}>A few thoughtful moments are waiting.</Text>
          <ApiStatus />
        </View>
        <Pressable accessibilityLabel="Open notifications" style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>●</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <SummaryCard count="3" label="Today" tone="gold" />
          <SummaryCard count="5" label="Follow-ups" tone="navy" />
          <SummaryCard count="2" label="Overdue" tone="warm" />
        </View>

        <SectionHeading title="Today's birthdays" actionLabel="View all" />
        {todayOccasions.filter((item) => item.kind === "Birthday").map((occasion) => (
          <OccasionCard key={occasion.id} occasion={occasion} />
        ))}

        <SectionHeading title="Anniversaries" />
        {todayOccasions.filter((item) => item.kind === "Anniversary").map((occasion) => (
          <OccasionCard key={occasion.id} occasion={occasion} />
        ))}

        <View style={styles.followUpCard}>
          <View style={styles.followUpIcon}><Text style={styles.followUpIconText}>✓</Text></View>
          <View style={styles.followUpCopy}>
            <Text style={styles.followUpTitle}>5 personal follow-ups</Text>
            <Text style={styles.followUpSubtitle}>Two are due before 2:00 PM today</Text>
          </View>
          <Link href="/explore" asChild>
            <Pressable accessibilityRole="button" style={styles.chevron}><Text style={styles.chevronText}>›</Text></Pressable>
          </Link>
        </View>

        <SectionHeading title="Coming up" actionLabel="Next 7 days" />
        <View style={styles.upcomingCard}>
          <UpcomingRow day="15" month="OCT" title="Meera's birthday" detail="In 3 days · Reminder set" />
          <View style={styles.divider} />
          <UpcomingRow day="18" month="OCT" title="Diwali greetings" detail="6 customers · Personal notes" />
        </View>

        <Link href="/customers" asChild>
          <Pressable accessibilityRole="button" style={styles.customerButton}>
            <Text style={styles.customerButtonText}>View my customers</Text>
            <Text style={styles.customerButtonArrow}>→</Text>
          </Pressable>
        </Link>
      </ScrollView>
      <BottomNav active="today" />
    </SafeAreaView>
  );
}

function SummaryCard({ count, label, tone }: { count: string; label: string; tone: "gold" | "navy" | "warm" }) {
  return (
    <View style={[styles.summaryCard, styles[`${tone}Summary`]]}>
      <Text style={[styles.summaryCount, tone === "navy" && styles.lightText]}>{count}</Text>
      <Text style={[styles.summaryLabel, tone === "navy" && styles.lightMuted]}>{label}</Text>
    </View>
  );
}

function UpcomingRow({ day, month, title, detail }: { day: string; month: string; title: string; detail: string }) {
  return (
    <View style={styles.upcomingRow}>
      <View style={styles.dateBlock}><Text style={styles.dateDay}>{day}</Text><Text style={styles.dateMonth}>{month}</Text></View>
      <View><Text style={styles.upcomingTitle}>{title}</Text><Text style={styles.upcomingDetail}>{detail}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.navy },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: colors.goldLight, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 },
  greeting: { color: colors.white, fontSize: 25, fontWeight: "700", letterSpacing: -0.4 },
  subtitle: { color: colors.blueGrey, fontSize: 14, marginTop: 5 },
  notificationButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navyLight, alignItems: "center", justifyContent: "center" },
  notificationIcon: { color: colors.gold, fontSize: 17 },
  content: { backgroundColor: colors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingBottom: 120 },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: -6, marginBottom: spacing.xl },
  summaryCard: { flex: 1, borderRadius: radii.md, padding: 14, minHeight: 85, justifyContent: "center" },
  goldSummary: { backgroundColor: colors.goldPale }, navySummary: { backgroundColor: colors.navy }, warmSummary: { backgroundColor: colors.rosePale },
  summaryCount: { color: colors.navy, fontSize: 25, fontWeight: "800" },
  summaryLabel: { color: colors.muted, fontSize: 12, marginTop: 3, fontWeight: "600" },
  lightText: { color: colors.white }, lightMuted: { color: colors.blueGrey },
  followUpCard: { ...shadow, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", marginBottom: spacing.xl },
  followUpIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.sagePale },
  followUpIconText: { color: colors.sage, fontWeight: "800", fontSize: 18 },
  followUpCopy: { flex: 1, paddingHorizontal: 13 },
  followUpTitle: { color: colors.ink, fontWeight: "700", fontSize: 15 }, followUpSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  chevron: { padding: 8 }, chevronText: { color: colors.navy, fontSize: 27 },
  upcomingCard: { backgroundColor: colors.white, borderRadius: radii.lg, paddingHorizontal: spacing.md, marginBottom: spacing.lg, ...shadow },
  upcomingRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md },
  dateBlock: { width: 48, height: 51, borderRadius: 12, backgroundColor: colors.warm, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  dateDay: { color: colors.navy, fontWeight: "800", fontSize: 18 }, dateMonth: { color: colors.muted, fontWeight: "700", fontSize: 9, letterSpacing: 0.5 },
  upcomingTitle: { color: colors.ink, fontWeight: "700", fontSize: 14 }, upcomingDetail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 64 },
  customerButton: { backgroundColor: colors.navy, borderRadius: radii.md, paddingVertical: 16, paddingHorizontal: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  customerButtonText: { color: colors.white, fontWeight: "700", fontSize: 15 }, customerButtonArrow: { color: colors.goldLight, fontSize: 20 }
});
