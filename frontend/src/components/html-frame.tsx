import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

export type HtmlFrameProps = { html: string; onMessage?: (data: any) => void; style?: StyleProp<ViewStyle>; frameKey?: string | number };

/** Renders self-contained HTML (native: WebView). Messages are JSON strings posted by the page. */
export function HtmlFrame({ html, onMessage, style, frameKey }: HtmlFrameProps) {
  return (
    <WebView
      key={frameKey}
      originWhitelist={["*"]}
      source={{ html }}
      style={[{ flex: 1, backgroundColor: "transparent" }, style]}
      javaScriptEnabled
      scrollEnabled={false}
      onMessage={(e) => {
        try { onMessage?.(JSON.parse(e.nativeEvent.data)); } catch {}
      }}
    />
  );
}
