import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Redirect } from "expo-router";
import React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingState } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useAppTheme } from "@/lib/theme";

export default function TabsLayout() {
  const session = authClient.useSession();
  const { colors, isDark } = useAppTheme();
  const tabContentStyle = React.useMemo(
    () =>
      ({
        backgroundColor: colors.background,
      }) satisfies ViewStyle,
    [colors.background],
  );

  if (session.isPending) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <LoadingState message="Opening Careeright" />
      </SafeAreaView>
    );
  }

  if (!session.data?.user) {
    return <Redirect href={"/sign-in" as never} />;
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <NativeTabs
        backgroundColor={colors.surface}
        blurEffect={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
        disableTransparentOnScrollEdge
        iconColor={{ default: colors.textMuted, selected: colors.primary }}
        indicatorColor={colors.primarySoft}
        labelStyle={{
          default: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
          selected: { color: colors.primary, fontSize: 11, fontWeight: "800" },
        }}
        labelVisibilityMode="labeled"
        minimizeBehavior="onScrollDown"
        rippleColor={colors.primarySoft}
        shadowColor={colors.border}
        tintColor={colors.primary}
      >
        <NativeTabs.Trigger
          contentStyle={tabContentStyle}
          disableAutomaticContentInsets
          name="dashboard"
        >
          <NativeTabs.Trigger.Icon md="space_dashboard" sf="chart.bar.doc.horizontal" />
          <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          contentStyle={tabContentStyle}
          disableAutomaticContentInsets
          name="board"
        >
          <NativeTabs.Trigger.Icon md="view_kanban" sf="list.bullet.rectangle" />
          <NativeTabs.Trigger.Label>Board</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          contentStyle={tabContentStyle}
          disableAutomaticContentInsets
          name="jobs"
        >
          <NativeTabs.Trigger.Icon md="work" sf="briefcase" />
          <NativeTabs.Trigger.Label>Jobs</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          contentStyle={tabContentStyle}
          disableAutomaticContentInsets
          name="learn"
        >
          <NativeTabs.Trigger.Icon md="menu_book" sf="book.closed" />
          <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          contentStyle={tabContentStyle}
          disableAutomaticContentInsets
          name="more"
        >
          <NativeTabs.Trigger.Icon md="more_horiz" sf="ellipsis.circle" />
          <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
