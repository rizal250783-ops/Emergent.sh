import React, { useEffect } from "react";
import { View } from "react-native";
import type { HtmlFrameProps } from "@/src/components/html-frame";

/** Web variant: sandboxed iframe (react-native-webview has no web target). */
export function HtmlFrame({ html, onMessage, style, frameKey }: HtmlFrameProps) {
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      try {
        const m = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
        if (m && typeof m === "object" && typeof m.type === "string" && m.type.startsWith("bsi-")) onMessage?.(m);
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onMessage]);
  return (
    <View style={[{ flex: 1 }, style]}>
      {React.createElement("iframe", {
        key: frameKey,
        srcDoc: html,
        style: { border: 0, width: "100%", height: "100%", display: "block" },
        sandbox: "allow-scripts allow-same-origin",
        title: "Peta",
      })}
    </View>
  );
}
