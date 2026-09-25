import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, font } from "@/src/theme";
import { Icon } from "@/src/components/ui";

type ToastType = "success" | "error" | "info";
interface ToastState { message: string; type: ToastType }

const Ctx = createContext<(msg: string, type?: ToastType) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const show = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, type });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToast(null));
    }, 2600);
  }, [opacity]);

  const bg = toast?.type === "error" ? colors.error : toast?.type === "info" ? colors.surfaceInverse : colors.success;
  const iconName = toast?.type === "error" ? "alert-circle" : toast?.type === "info" ? "info" : "check-circle";

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { top: insets.top + 12, bottom: undefined, alignItems: "center", zIndex: 9999, opacity },
          ]}
        >
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: bg,
            paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, maxWidth: "90%",
            shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
          }}>
            <Icon name={iconName as any} size={18} color="#FFFFFF" />
            <Text style={[font("700"), { color: "#FFFFFF", flexShrink: 1 }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}
