import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import React from "react";

import { LoadingState } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useAppTheme } from "@/lib/theme";

export default function AuthLayout() {
  const { colors } = useAppTheme();
  const session = authClient.useSession();

  if (session.isPending) {
    return <LoadingState message="Checking your session" />;
  }

  if (session.data?.user) {
    return <Redirect href={"/dashboard" as never} />;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}
    />
  );
}
