import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthProvider, useAuth } from "@/auth/auth-context";
import { colors } from "@/constants/design";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthenticatedNavigator />
    </AuthProvider>
  );
}

function AuthenticatedNavigator() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.gold} /></View>;

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: colors.white, headerTitleStyle: { fontWeight: "700" }, contentStyle: { backgroundColor: colors.canvas }, headerShadowVisible: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: "Create manager account" }} />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="customers" options={{ title: "My Customers" }} />
        <Stack.Screen name="customer/new" options={{ title: "Add Customer" }} />
        <Stack.Screen name="customer/[id]" options={{ title: "Customer" }} />
        <Stack.Screen name="explore" options={{ title: "Account" }} />
        <Stack.Screen name="manager-approvals" options={{ title: "Manager Approvals" }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy } });
