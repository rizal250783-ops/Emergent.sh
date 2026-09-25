import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox, View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider } from "@/src/auth";
import { ToastProvider } from "@/src/components/toast";
import { ConfirmProvider } from "@/src/components/confirm";
import { FONTS } from "@/src/theme";
import { FavoritesProvider } from "@/src/favorites";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [FONTS.regular]: require("../assets/fonts/Lato-Regular.ttf"),
    [FONTS.bold]: require("../assets/fonts/Lato-Bold.ttf"),
    [FONTS.black]: require("../assets/fonts/Lato-Black.ttf"),
    [FONTS.italic]: require("../assets/fonts/Lato-Italic.ttf"),
  });
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#00A0A0" }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <AuthProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <FavoritesProvider>
                    <StatusBar style="light" />
                    <Stack screenOptions={{ headerShown: false }} />
                  </FavoritesProvider>
                </ConfirmProvider>
              </ToastProvider>
            </AuthProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
