import type { LucideIcon } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { lightImpact } from "@/lib/haptics";
import { useAppTheme } from "@/lib/theme";

export const spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
};

export type Tone =
  | "default"
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "violet";

export function ScreenScroll({
  children,
  contentStyle,
  tabBar = false,
}: {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  tabBar?: boolean;
}) {
  const { colors } = useAppTheme();
  const safeContentStyle = useScreenContentStyle({ tabBar });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.screenContent, contentStyle, safeContentStyle]}
    >
      {children}
    </ScrollView>
  );
}

export function useScreenContentStyle({
  tabBar = false,
}: { tabBar?: boolean } = {}) {
  const insets = useSafeAreaInsets();
  const bottomInset = tabBar ? 0 : insets.bottom;
  const bottomNavigationReserve = tabBar ? 72 : 0;
  const topInset = tabBar ? 0 : insets.top;

  return React.useMemo(
    () =>
      ({
        paddingBottom: Math.max(
          spacing.seven,
          bottomInset + spacing.six + bottomNavigationReserve,
        ),
        paddingTop: Math.max(spacing.four, topInset + spacing.three),
      }) satisfies ViewStyle,
    [bottomInset, bottomNavigationReserve, topInset],
  );
}

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]} />
          <Text selectable style={[styles.eyebrow, { color: colors.primary }]}>
            Careeright
          </Text>
        </View>
        <Text selectable style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
  tone = "default",
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  tone?: Tone;
}) {
  const { colors } = useAppTheme();
  const borderColor =
    tone === "primary"
      ? colors.primary
      : tone === "accent"
        ? colors.accent
        : tone === "success"
          ? colors.success
          : tone === "danger"
            ? colors.danger
            : tone === "violet"
              ? colors.violet
              : colors.border;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor,
          boxShadow: `0 10px 24px ${colors.shadow}`,
        } as ViewStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.sectionTitle}>
      <Text selectable style={[styles.sectionHeading, { color: colors.text }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text selectable style={[styles.smallText, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useAppTheme();
  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.surfaceStrong
          : "transparent";
  const textColor =
    variant === "primary" || variant === "danger" ? "#FFFFFF" : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        lightImpact();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor:
            variant === "ghost" ? colors.border : backgroundColor,
          opacity: disabled ? 0.55 : pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} size="small" /> : null}
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text style={[styles.buttonText, { color: textColor }]}>{child}</Text>
        ) : (
          child
        ),
      )}
    </Pressable>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const { colors } = useAppTheme();
  const color =
    tone === "primary"
      ? colors.primary
      : tone === "accent"
        ? colors.accent
        : tone === "success"
          ? colors.success
          : tone === "danger"
            ? colors.danger
            : tone === "violet"
              ? colors.violet
              : colors.textMuted;
  const backgroundColor =
    tone === "primary"
      ? colors.primarySoft
      : tone === "accent"
        ? colors.accentSoft
        : tone === "success"
          ? colors.successSoft
          : tone === "danger"
            ? colors.dangerSoft
            : tone === "violet"
              ? colors.violetSoft
              : colors.surfaceMuted;

  return (
    <View style={[styles.badge, { backgroundColor, borderColor: color }]}>
      <Text selectable style={[styles.badgeText, { color }]}>
        {children}
      </Text>
    </View>
  );
}

export function TextField({
  label,
  multiline,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.field}>
      <Text selectable style={[styles.fieldLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline ? styles.textarea : null,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            color: colors.text,
          },
          style,
        ]}
      />
    </View>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => {
              lightImpact();
              onChange(option.value);
            }}
            style={[
              styles.segment,
              selected
                ? {
                    backgroundColor: colors.surface,
                    boxShadow: `0 4px 12px ${colors.shadow}`,
                  } as ViewStyle
                : null,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: selected ? colors.text : colors.textMuted },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  const { colors } = useAppTheme();
  const toneColor =
    tone === "accent"
      ? colors.accent
      : tone === "success"
        ? colors.success
        : tone === "danger"
          ? colors.danger
          : tone === "violet"
            ? colors.violet
            : colors.primary;

  return (
    <Card style={styles.statCard}>
      <View style={styles.statRow}>
        {Icon ? <Icon color={toneColor} size={20} /> : null}
        <Text selectable style={[styles.statLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
      </View>
      <Text selectable style={[styles.statValue, { color: colors.text }]}>
        {value}
      </Text>
      {detail ? (
        <Text selectable style={[styles.smallText, { color: colors.textMuted }]}>
          {detail}
        </Text>
      ) : null}
    </Card>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const { colors } = useAppTheme();

  return (
    <Card style={styles.emptyState}>
      <Text selectable style={[styles.sectionHeading, { color: colors.text }]}>
        {title}
      </Text>
      <Text selectable style={[styles.smallText, { color: colors.textMuted }]}>
        {message}
      </Text>
    </Card>
  );
}

export function LoadingState({ message = "Loading" }: { message?: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text selectable style={[styles.smallText, { color: colors.textMuted }]}>
        {message}
      </Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      title="Could not load"
      message={`${message}${onRetry ? " Pull to refresh or try again." : ""}`}
    />
  );
}

export function SelectSheet<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.field}>
      <Text selectable style={[styles.fieldLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <View style={styles.optionWrap}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              lightImpact();
              onChange(option.value);
            }}
          >
            <Badge tone={option.value === value ? "primary" : "default"}>
              {option.label}
            </Badge>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ChoiceDialog<T extends string>({
  isBusy = false,
  onClose,
  onSelect,
  options,
  selectedValue,
  subtitle,
  title,
  visible,
}: {
  isBusy?: boolean;
  onClose: () => void;
  onSelect: (value: T) => void;
  options: {
    count?: number;
    description?: string;
    disabled?: boolean;
    label: string;
    meta?: string;
    tone?: Tone;
    value: T;
  }[];
  selectedValue?: T;
  subtitle?: string;
  title: string;
  visible: boolean;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.dialogRoot}>
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(100)}
          style={[
            StyleSheet.absoluteFillObject,
            styles.dialogBackdrop,
          ]}
        >
          <Pressable
            accessibilityLabel="Close dialog"
            accessibilityRole="button"
            disabled={isBusy}
            onPress={onClose}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <View
          pointerEvents="box-none"
          style={[
            styles.dialogPosition,
            {
              paddingBottom: insets.bottom + spacing.three,
              paddingHorizontal: spacing.four,
              paddingTop: insets.top + spacing.three,
            },
          ]}
        >
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(220)}
            exiting={SlideOutDown.duration(160)}
            style={[
              styles.dialogSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                boxShadow: `0 18px 40px ${colors.shadow}`,
                maxHeight: Math.max(360, height - insets.top - insets.bottom - 48),
              } as ViewStyle,
            ]}
          >
            <View
              style={[
                styles.dialogHandle,
                { backgroundColor: colors.surfaceStrong },
              ]}
            />
            <View style={styles.dialogHeader}>
              <View style={styles.dialogTitleWrap}>
                <Text
                  selectable
                  style={[styles.dialogTitle, { color: colors.text }]}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    selectable
                    style={[styles.dialogSubtitle, { color: colors.textMuted }]}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.dialogCloseButton,
                  {
                    backgroundColor: colors.surfaceMuted,
                    opacity: isBusy ? 0.5 : pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Text style={[styles.dialogCloseText, { color: colors.text }]}>
                  Close
                </Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.dialogOptions}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const selected = option.value === selectedValue;
                const tone = option.tone ?? "default";
                const toneColor = getToneColor(colors, tone);
                const disabled = isBusy || option.disabled;

                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled}
                    key={option.value}
                    onPress={() => {
                      lightImpact();
                      onSelect(option.value);
                    }}
                    style={({ pressed }) => [
                      styles.dialogOption,
                      {
                        backgroundColor: selected
                          ? getToneBackgroundColor(colors, tone)
                          : colors.surfaceMuted,
                        borderColor: selected ? toneColor : colors.border,
                        opacity: disabled ? 0.54 : pressed ? 0.76 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dialogOptionMark,
                        {
                          backgroundColor: selected ? toneColor : "transparent",
                          borderColor: toneColor,
                        },
                      ]}
                    >
                      {selected ? (
                        <View style={styles.dialogOptionMarkInner} />
                      ) : null}
                    </View>
                    <View style={styles.dialogOptionCopy}>
                      <View style={styles.dialogOptionTopRow}>
                        <Text
                          style={[
                            styles.dialogOptionLabel,
                            { color: colors.text },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {option.meta ? (
                          <Text
                            style={[
                              styles.dialogOptionMeta,
                              { color: colors.textMuted },
                            ]}
                          >
                            {option.meta}
                          </Text>
                        ) : null}
                      </View>
                      {option.description ? (
                        <Text
                          style={[
                            styles.dialogOptionDescription,
                            { color: colors.textMuted },
                          ]}
                        >
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                    {typeof option.count === "number" ? (
                      <View
                        style={[
                          styles.dialogCount,
                          {
                            backgroundColor: selected
                              ? colors.surface
                              : colors.surfaceStrong,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dialogCountText,
                            { color: selected ? toneColor : colors.textMuted },
                          ]}
                        >
                          {option.count}
                        </Text>
                      </View>
                    ) : null}
                    {isBusy && selected ? (
                      <ActivityIndicator color={toneColor} size="small" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export function Divider() {
  const { colors } = useAppTheme();

  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function getToneColor(
  colors: ReturnType<typeof useAppTheme>["colors"],
  tone: Tone,
) {
  if (tone === "primary") {
    return colors.primary;
  }

  if (tone === "accent") {
    return colors.accent;
  }

  if (tone === "success") {
    return colors.success;
  }

  if (tone === "danger") {
    return colors.danger;
  }

  if (tone === "violet") {
    return colors.violet;
  }

  return colors.textMuted;
}

function getToneBackgroundColor(
  colors: ReturnType<typeof useAppTheme>["colors"],
  tone: Tone,
) {
  if (tone === "primary") {
    return colors.primarySoft;
  }

  if (tone === "accent") {
    return colors.accentSoft;
  }

  if (tone === "success") {
    return colors.successSoft;
  }

  if (tone === "danger") {
    return colors.dangerSoft;
  }

  if (tone === "violet") {
    return colors.violetSoft;
  }

  return colors.surfaceMuted;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.one,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  button: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.two,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.three,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  brandMark: {
    borderCurve: "continuous",
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
  },
  card: {
    borderCurve: "continuous",
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.three,
    padding: spacing.four,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  dialogBackdrop: {
    backgroundColor: "rgba(10, 15, 17, 0.56)",
  },
  dialogCloseButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.three,
  },
  dialogCloseText: {
    fontSize: 13,
    fontWeight: "800",
  },
  dialogCount: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minWidth: 34,
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.one,
  },
  dialogCountText: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  dialogHandle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 5,
    width: 42,
  },
  dialogHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.three,
    justifyContent: "space-between",
  },
  dialogOption: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.three,
    minHeight: 68,
    padding: spacing.three,
  },
  dialogOptionCopy: {
    flex: 1,
    gap: spacing.one,
  },
  dialogOptionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  dialogOptionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  dialogOptionMark: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  dialogOptionMarkInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  dialogOptionMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  dialogOptionTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
  },
  dialogOptions: {
    gap: spacing.two,
    paddingTop: spacing.one,
  },
  dialogPosition: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dialogRoot: {
    flex: 1,
  },
  dialogSheet: {
    borderCurve: "continuous",
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.four,
    overflow: "hidden",
    padding: spacing.four,
  },
  dialogSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  dialogTitle: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29,
  },
  dialogTitleWrap: {
    flex: 1,
    gap: spacing.one,
  },
  emptyState: {
    alignItems: "flex-start",
    minHeight: 132,
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  field: {
    gap: spacing.two,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.three,
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: spacing.one,
  },
  input: {
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
  },
  loading: {
    alignItems: "center",
    gap: spacing.three,
    justifyContent: "center",
    minHeight: 220,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  screenContent: {
    gap: spacing.four,
    padding: spacing.four,
    paddingBottom: spacing.seven,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "900",
  },
  sectionTitle: {
    gap: spacing.one,
  },
  segment: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "800",
  },
  segmented: {
    borderCurve: "continuous",
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.one,
    padding: spacing.one,
  },
  smallText: {
    fontSize: 13,
    lineHeight: 19,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
  },
  statLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
  },
  statValue: {
    fontSize: 30,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  textarea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 39,
  },
});
