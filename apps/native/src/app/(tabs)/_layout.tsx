import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Redirect } from "expo-router";
import React from "react";

import { LoadingState } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useAppTheme } from "@/lib/theme";

export default function TabsLayout() {
  const session = authClient.useSession();
  const { colors } = useAppTheme();

  if (session.isPending) {
    return <LoadingState message="Opening Careeright" />;
  }

  if (!session.data?.user) {
    return <Redirect href={"/sign-in" as never} />;
  }

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.primarySoft}
      labelStyle={{ selected: { color: colors.primary } }}
    >
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Icon sf="chart.bar.doc.horizontal" />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="board">
        <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" />
        <NativeTabs.Trigger.Label>Board</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="jobs">
        <NativeTabs.Trigger.Icon sf="briefcase" />
        <NativeTabs.Trigger.Label>Jobs</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn">
        <NativeTabs.Trigger.Icon sf="book.closed" />
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon sf="ellipsis.circle" />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
