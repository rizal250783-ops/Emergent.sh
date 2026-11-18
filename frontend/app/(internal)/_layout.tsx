import React from "react";
import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import Icon from "@react-native-vector-icons/feather";
import { useTheme } from "@/src/theme";
import { useAuth, isRcg } from "@/src/auth";
import { Loading } from "@/src/components/ui";

export default function InternalLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.surface }}><Loading /></View>;
  if (!user) return <Redirect href="/login" />;

  const role = user.role;
  const ma = role === "marketing_asset";
  const acrm = role === "acrm";
  const rcg = isRcg(role);

  const queueLabel = ma ? "Asset Saya" : acrm ? "Review" : "Approval";
  const queueIcon = ma ? "folder" : "check-square";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: "#004D4D",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          ...(typeof window !== "undefined" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center", paddingVertical: 4 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Beranda", tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="queue"
        options={{ title: queueLabel, tabBarIcon: ({ color, size }) => <Icon name={queueIcon as any} size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Tambah",
          href: ma ? "/add" : null,
          tabBarIcon: ({ color, size }) => <Icon name="plus-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: "Kelola",
          href: rcg ? "/manage" : null,
          tabBarIcon: ({ color, size }) => <Icon name="settings" size={size} color={color} /> ,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: "Notifikasi", tabBarIcon: ({ color, size }) => <Icon name="bell" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Akun", tabBarIcon: ({ color, size }) => <Icon name="user" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
