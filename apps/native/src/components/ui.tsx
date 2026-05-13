import type { LucideIcon } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
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

type Tone = "default" | "primary" | "accent" | "success" | "danger" | "violet";

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

export function Divider() {
  const { colors } = useAppTheme();

  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
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
