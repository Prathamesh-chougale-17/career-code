import { LogIn } from "lucide-react-native";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Card, ScreenScroll, spacing } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useAppTheme } from "@/lib/theme";

export default function SignInScreen() {
  const { colors } = useAppTheme();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function onSignIn() {
    setIsSigningIn(true);
    setError(null);

    try {
      const result = await authClient.signIn.social({
        callbackURL: "/dashboard",
        provider: "google",
      });

      if (result.error) {
        setError(result.error.message ?? "Google sign-in failed.");
      }
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Google sign-in failed.",
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <ScreenScroll contentStyle={styles.content}>
      <View style={styles.brandMark}>
        <Text style={styles.brandLetter}>C</Text>
      </View>
      <View style={styles.copy}>
        <Text selectable style={[styles.title, { color: colors.text }]}>
          Careeright
        </Text>
        <Text selectable style={[styles.subtitle, { color: colors.textMuted }]}>
          Your AI-safe career workspace for tasks, job tracking, DSA practice,
          proposals, and profile readiness.
        </Text>
      </View>
      <Card style={styles.card}>
        <View style={styles.signInHeader}>
          <LogIn color={colors.primary} size={24} />
          <Text selectable style={[styles.cardTitle, { color: colors.text }]}>
            Sign in to continue
          </Text>
        </View>
        <Text selectable style={[styles.small, { color: colors.textMuted }]}>
          Use the same Google account as the web app. Careeright stores your
          session securely on this device.
        </Text>
        <Button loading={isSigningIn} onPress={onSignIn}>
          Continue with Google
        </Button>
        {error ? (
          <Text selectable style={[styles.error, { color: colors.danger }]}>
            {error}
          </Text>
        ) : null}
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  brandLetter: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
  },
  brandMark: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#0F9F8E",
    borderCurve: "continuous",
    borderRadius: 28,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  card: {
    alignSelf: "stretch",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.five,
  },
  copy: {
    alignItems: "center",
    gap: spacing.two,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
  signInHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
  },
});
