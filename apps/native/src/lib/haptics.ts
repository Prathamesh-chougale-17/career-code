import * as Haptics from "expo-haptics";

export function lightImpact() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successImpact() {
  void Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success,
  ).catch(() => {});
}

export function warningImpact() {
  void Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Warning,
  ).catch(() => {});
}
