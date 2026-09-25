import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, FlatList, useWindowDimensions, StatusBar, Platform } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles } from "@/src/theme";
import { Icon, spacing } from "@/src/components/ui";

const MAX_SCALE = 4;

function ZoomableImage({ uri, width, height, onZoomChange }: { uri: string; width: number; height: number; onZoomChange: (z: boolean) => void }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const clamp = (v: number, min: number, max: number) => {
    "worklet";
    return Math.min(Math.max(v, min), max);
  };
  const settle = () => {
    "worklet";
    if (scale.value < 1.05) {
      scale.value = withTiming(1); tx.value = withTiming(0); ty.value = withTiming(0);
      savedScale.value = 1; savedTx.value = 0; savedTy.value = 0;
      runOnJS(onZoomChange)(false);
      return;
    }
    const maxX = (width * (scale.value - 1)) / 2;
    const maxY = (height * (scale.value - 1)) / 2;
    tx.value = withTiming(clamp(tx.value, -maxX, maxX));
    ty.value = withTiming(clamp(ty.value, -maxY, maxY));
    savedScale.value = scale.value; savedTx.value = tx.value; savedTy.value = ty.value;
    runOnJS(onZoomChange)(true);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = clamp(savedScale.value * e.scale, 0.8, MAX_SCALE); })
    .onEnd(() => { settle(); });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart(() => { if (scale.value <= 1.05) return; })
    .onUpdate((e) => {
      if (scale.value <= 1.05) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => { settle(); });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1.05) {
        scale.value = withTiming(1); tx.value = withTiming(0); ty.value = withTiming(0);
        savedScale.value = 1; savedTx.value = 0; savedTy.value = 0;
        runOnJS(onZoomChange)(false);
      } else {
        const target = 2.5;
        scale.value = withTiming(target);
        // zoom towards tap point
        const dx = (width / 2 - e.x) * (target - 1);
        const dy = (height / 2 - e.y) * (target - 1);
        tx.value = withTiming(dx); ty.value = withTiming(dy);
        savedScale.value = target; savedTx.value = dx; savedTy.value = dy;
        runOnJS(onZoomChange)(true);
      }
    });

  const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[{ width, height, alignItems: "center", justifyContent: "center" }, style]}>
        <Image source={{ uri }} style={{ width, height }} contentFit="contain" transition={150} />
      </Animated.View>
    </GestureDetector>
  );
}

/** Full-screen photo gallery: swipe between photos, pinch/double-tap to zoom, drag when zoomed. */
export function PhotoGallery({ images, index, visible, onClose }: { images: string[]; index: number; visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const [current, setCurrent] = useState(index);
  const [zoomed, setZoomed] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => { if (visible) { setCurrent(index); setZoomed(false); } }, [visible, index]);

  const onZoomChange = useCallback((z: boolean) => setZoomed(z), []);
  const goTo = (i: number) => {
    const idx = Math.max(0, Math.min(images.length - 1, i));
    listRef.current?.scrollToOffset({ offset: idx * width, animated: true });
    setCurrent(idx);
  };

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent presentationStyle="fullScreen">
      <GestureHandlerRootView style={s.root}>
        {Platform.OS !== "web" && <StatusBar hidden />}
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u, i) => `${i}-${u}`}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          onScroll={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / width); if (i !== current && Number.isFinite(i)) setCurrent(i); }}
          scrollEventThrottle={64}
          renderItem={({ item }) => (
            <View style={{ width, height, overflow: "hidden" }}>
              <ZoomableImage uri={item} width={width} height={height} onZoomChange={onZoomChange} />
            </View>
          )}
        />
        <View style={[s.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <Pressable style={s.btn} onPress={onClose} testID="gallery-close" hitSlop={8}>
            <Icon name="x" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={s.counter} testID="gallery-counter">{current + 1} / {images.length}</Text>
          <View style={{ width: 40 }} />
        </View>
        {images.length > 1 && (
          <View style={[s.bottom, { paddingBottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
            <Pressable style={[s.btn, current === 0 && s.btnOff]} disabled={current === 0} onPress={() => goTo(current - 1)} testID="gallery-prev">
              <Icon name="chevron-left" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={s.hint}>{zoomed ? "Geser untuk melihat detail • ketuk 2x untuk reset" : "Cubit atau ketuk 2x untuk zoom"}</Text>
            <Pressable style={[s.btn, current === images.length - 1 && s.btnOff]} disabled={current === images.length - 1} onPress={() => goTo(current + 1)} testID="gallery-next">
              <Icon name="chevron-right" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const useStyles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: "#000000" },
  top: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  btn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  btnOff: { opacity: 0.3 },
  counter: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  hint: { color: "rgba(255,255,255,0.75)", fontSize: 11, flex: 1, textAlign: "center" },
}));
