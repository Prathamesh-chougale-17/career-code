import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileUp,
  KeyRound,
  LogOut,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  ScreenHeader,
  ScreenScroll,
  SectionTitle,
  SegmentedControl,
  SelectSheet,
  TextField,
  spacing,
  useScreenContentStyle,
} from "@/components/ui";
import { rpcClient } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { getCareerightOrigin } from "@/lib/config";
import { successImpact, warningImpact } from "@/lib/haptics";
import { formatLongDate, titleCase } from "@/lib/labels";
import { openExternalUrl } from "@/lib/open-url";
import { uploadResumePdf } from "@/lib/upload-resume";
import { useAppTheme } from "@/lib/theme";
import {
  boardSnapshotQueryKey,
  dashboardAnalyticsQueryKey,
  mcpTokensQueryKey,
  profileImportsQueryKey,
  profileSnapshotQueryKey,
  proposalHistoryQueryKey,
} from "@careeright/api/query-keys";
import type {
  AiProposal,
  ProposedTask,
} from "@careeright/domain/kanban/schema";
import type {
  ProfileApplicationDefaults,
  ProfileBasicsInput,
  ProfileImport,
  ProfileItem,
  ProfileItemType,
  ProfileSnapshot,
} from "@careeright/domain/profile/schema";
import { taskFingerprint } from "@careeright/domain/kanban/task-fingerprint";

type MoreView = "profile" | "proposals" | "mcp" | "settings";
type ProfileBasicsDraft = ProfileBasicsInput;
type ProfileItemDraft = {
  description: string;
  organization: string;
  tags: string;
  title: string;
  type: ProfileItemType;
};

const moreOptions: { label: string; value: MoreView }[] = [
  { label: "Profile", value: "profile" },
  { label: "Proposals", value: "proposals" },
  { label: "MCP", value: "mcp" },
  { label: "Settings", value: "settings" },
];

const profileItemTypeOptions: { label: string; value: ProfileItemType }[] = [
  { label: "Experience", value: "experience" },
  { label: "Education", value: "education" },
  { label: "Project", value: "project" },
  { label: "Skill", value: "skill" },
  { label: "Certificate", value: "certification" },
  { label: "Achievement", value: "achievement" },
];

export default function MoreScreen() {
  const [view, setView] = useState<MoreView>("profile");

  if (view === "proposals") {
    return <ProposalsView setView={setView} view={view} />;
  }

  if (view === "mcp") {
    return <McpView setView={setView} view={view} />;
  }

  if (view === "settings") {
    return <SettingsView setView={setView} view={view} />;
  }

  return <ProfileView setView={setView} view={view} />;
}

function ProfileView({
  setView,
  view,
}: {
  setView: (view: MoreView) => void;
  view: MoreView;
}) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: profileSnapshotQueryKey,
    queryFn: () => rpcClient.profile.snapshot(),
  });
  const importsQuery = useQuery({
    queryKey: profileImportsQueryKey,
    queryFn: () => rpcClient.profileImport.list(),
  });
  const [basics, setBasics] = useState<ProfileBasicsDraft>(emptyProfileBasics);
  const [defaults, setDefaults] =
    useState<ProfileApplicationDefaults>(emptyApplicationDefaults);
  const [itemDraft, setItemDraft] = useState<ProfileItemDraft>({
    description: "",
    organization: "",
    tags: "",
    title: "",
    type: "experience",
  });

  useEffect(() => {
    if (profileQuery.data) {
      setBasics(snapshotToBasics(profileQuery.data));
      setDefaults(profileQuery.data.profile.applicationDefaults);
    }
  }, [profileQuery.data]);

  const invalidateProfile = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: profileSnapshotQueryKey }),
      queryClient.invalidateQueries({ queryKey: profileImportsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey }),
    ]);
  };

  const saveBasicsMutation = useMutation({
    mutationFn: () => rpcClient.profile.update(basics),
    onError: showMutationError("Could not save profile"),
    onSuccess: async () => {
      successImpact();
      await invalidateProfile();
    },
  });

  const saveDefaultsMutation = useMutation({
    mutationFn: () =>
      rpcClient.profile.updateApplicationDefaults({
        branch: defaults.branch,
        college: defaults.college,
        defaultSource: defaults.defaultSource,
        gender: defaults.gender,
        graduationPercentage: defaults.graduationPercentage,
        graduationYear: defaults.graduationYear,
        joiningAvailabilityDays: defaults.joiningAvailabilityDays,
        linkedinUrl: defaults.linkedinUrl,
        phone: defaults.phone,
        resumeLocalPath: defaults.resumeLocalPath,
        xBoard: defaults.xBoard,
        xPercentage: defaults.xPercentage,
        xiiBoard: defaults.xiiBoard,
        xiiPercentage: defaults.xiiPercentage,
      }),
    onError: showMutationError("Could not save application defaults"),
    onSuccess: async () => {
      successImpact();
      await invalidateProfile();
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () =>
      rpcClient.profile.createItem({
        description: itemDraft.description,
        endDate: "",
        location: "",
        organization: itemDraft.organization,
        startDate: "",
        tags: itemDraft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        title: itemDraft.title,
        type: itemDraft.type,
        url: "",
      }),
    onError: showMutationError("Could not add profile item"),
    onSuccess: async () => {
      setItemDraft({
        description: "",
        organization: "",
        tags: "",
        title: "",
        type: "experience",
      });
      successImpact();
      await invalidateProfile();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => rpcClient.profile.deleteItem({ itemId }),
    onError: showMutationError("Could not delete profile item"),
    onSuccess: async () => {
      warningImpact();
      await invalidateProfile();
    },
  });

  const importActionMutation = useMutation({
    mutationFn: async ({
      action,
      importId,
    }: {
      action: "apply" | "reject";
      importId: string;
    }) => {
      if (action === "apply") {
        await rpcClient.profileImport.apply({ importId });
        return;
      }

      await rpcClient.profileImport.reject({ importId });
    },
    onError: showMutationError("Could not update import"),
    onSuccess: async () => {
      successImpact();
      await invalidateProfile();
    },
  });

  const resumeImportMutation = useMutation({
    mutationFn: uploadResumePdf,
    onError: showMutationError("Could not import resume"),
    onSuccess: async (result) => {
      successImpact();
      Alert.alert(
        "Resume import ready",
        `Created a pending PDF import. ${result.warnings.join(" ")}`.trim(),
      );
      await invalidateProfile();
    },
  });

  async function pickResume() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "application/pdf",
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    resumeImportMutation.mutate(result.assets[0]);
  }

  function confirmDeleteItem(item: ProfileItem) {
    Alert.alert("Delete profile item?", item.title, [
      { style: "cancel", text: "Cancel" },
      {
        onPress: () => deleteItemMutation.mutate(item.id),
        style: "destructive",
        text: "Delete",
      },
    ]);
  }

  if (profileQuery.isPending) {
    return <LoadingState message="Loading profile" />;
  }

  return (
    <ScreenScroll tabBar>
      <ScreenHeader
        title="More"
        subtitle="Profile, proposals, MCP tools, and account controls."
      />
      <SegmentedControl onChange={setView} options={moreOptions} value={view} />

      <Card>
        <SectionTitle title="Basics" subtitle="Used across applications and resume review." />
        <ProfileTextField basics={basics} field="displayName" label="Name" setBasics={setBasics} />
        <ProfileTextField basics={basics} field="headline" label="Headline" setBasics={setBasics} />
        <ProfileTextField basics={basics} field="location" label="Location" setBasics={setBasics} />
        <ProfileTextField basics={basics} field="email" label="Email" setBasics={setBasics} />
        <ProfileTextField basics={basics} field="website" label="Website" setBasics={setBasics} />
        <ProfileTextField basics={basics} field="summary" label="Summary" multiline setBasics={setBasics} />
        <Button loading={saveBasicsMutation.isPending} onPress={() => saveBasicsMutation.mutate()}>
          Save profile
        </Button>
      </Card>

      <Card>
        <SectionTitle title="Application defaults" />
        <DefaultsField defaults={defaults} field="phone" label="Phone" setDefaults={setDefaults} />
        <DefaultsField defaults={defaults} field="linkedinUrl" label="LinkedIn" setDefaults={setDefaults} />
        <DefaultsField defaults={defaults} field="resumeLocalPath" label="Resume path" setDefaults={setDefaults} />
        <DefaultsField defaults={defaults} field="college" label="College" setDefaults={setDefaults} />
        <DefaultsField defaults={defaults} field="branch" label="Branch" setDefaults={setDefaults} />
        <View style={styles.taskActions}>
          <Button
            loading={saveDefaultsMutation.isPending}
            onPress={() => saveDefaultsMutation.mutate()}
            variant="secondary"
          >
            Save defaults
          </Button>
          <Button loading={resumeImportMutation.isPending} onPress={pickResume} variant="ghost">
            <FileUp size={16} /> Import PDF
          </Button>
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Profile items"
          subtitle={`${profileQuery.data?.items.length ?? 0} saved entries`}
        />
        <SelectSheet
          label="Type"
          onChange={(type) => setItemDraft((current) => ({ ...current, type }))}
          options={profileItemTypeOptions}
          value={itemDraft.type}
        />
        <TextField
          label="Title"
          onChangeText={(title) => setItemDraft((current) => ({ ...current, title }))}
          value={itemDraft.title}
        />
        <TextField
          label="Organization"
          onChangeText={(organization) =>
            setItemDraft((current) => ({ ...current, organization }))
          }
          value={itemDraft.organization}
        />
        <TextField
          label="Description"
          multiline
          onChangeText={(description) =>
            setItemDraft((current) => ({ ...current, description }))
          }
          value={itemDraft.description}
        />
        <TextField
          label="Tags"
          onChangeText={(tags) => setItemDraft((current) => ({ ...current, tags }))}
          value={itemDraft.tags}
        />
        <Button loading={createItemMutation.isPending} onPress={() => createItemMutation.mutate()}>
          <Plus color="#FFFFFF" size={16} /> Add item
        </Button>
        {(profileQuery.data?.items ?? []).map((item) => (
          <ProfileItemCard
            item={item}
            key={item.id}
            onDelete={() => confirmDeleteItem(item)}
          />
        ))}
      </Card>

      <Card>
        <SectionTitle title="Pending imports" />
        {importsQuery.isPending ? (
          <LoadingState message="Loading imports" />
        ) : (importsQuery.data ?? []).filter((item) => item.status === "pending").length === 0 ? (
          <EmptyState title="No pending imports" message="PDF and MCP imports will appear here for review." />
        ) : (
          (importsQuery.data ?? [])
            .filter((item) => item.status === "pending")
            .map((profileImport) => (
              <ImportCard
                isBusy={importActionMutation.isPending}
                key={profileImport.id}
                onApply={() =>
                  importActionMutation.mutate({
                    action: "apply",
                    importId: profileImport.id,
                  })
                }
                onReject={() =>
                  importActionMutation.mutate({
                    action: "reject",
                    importId: profileImport.id,
                  })
                }
                profileImport={profileImport}
              />
            ))
        )}
      </Card>
    </ScreenScroll>
  );
}

function ProposalsView({
  setView,
  view,
}: {
  setView: (view: MoreView) => void;
  view: MoreView;
}) {
  const { colors } = useAppTheme();
  const listContentStyle = useScreenContentStyle({ tabBar: true });
  const queryClient = useQueryClient();
  const proposalsQuery = useQuery({
    queryKey: proposalHistoryQueryKey,
    queryFn: () => rpcClient.proposal.list(),
  });
  const boardQuery = useQuery({
    queryKey: boardSnapshotQueryKey,
    queryFn: () => rpcClient.board.snapshot(),
  });
  const existingFingerprints = useMemo(
    () => new Set((boardQuery.data?.tasks ?? []).map((task) => taskFingerprint(task))),
    [boardQuery.data?.tasks],
  );
  const proposals = proposalsQuery.data ?? [];
  const pendingCount = proposals.filter((proposal) => proposal.status === "pending").length;

  const invalidateProposals = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: proposalHistoryQueryKey }),
      queryClient.invalidateQueries({ queryKey: boardSnapshotQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey }),
    ]);
  };

  const proposalActionMutation = useMutation({
    mutationFn: ({
      action,
      proposalId,
    }: {
      action: "accept" | "reject" | "delete";
      proposalId: string;
    }) => {
      if (action === "accept") {
        return rpcClient.proposal.accept({ proposalId });
      }

      if (action === "reject") {
        return rpcClient.proposal.reject({ proposalId });
      }

      return rpcClient.proposal.delete({ proposalId });
    },
    onError: showMutationError("Could not update proposal"),
    onSuccess: async () => {
      successImpact();
      await invalidateProposals();
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: ({ proposal, task }: { proposal: AiProposal; task: ProposedTask }) =>
      rpcClient.task.create(proposedTaskInput(proposal, task)),
    onError: showMutationError("Could not add proposed task"),
    onSuccess: async () => {
      successImpact();
      await invalidateProposals();
    },
  });

  const addAllMutation = useMutation({
    mutationFn: async (proposal: AiProposal) => {
      const tasks = remainingProposalTasks(proposal, existingFingerprints);
      await Promise.all(
        tasks.map((task) => rpcClient.task.create(proposedTaskInput(proposal, task))),
      );
    },
    onError: showMutationError("Could not add proposed tasks"),
    onSuccess: async () => {
      successImpact();
      await invalidateProposals();
    },
  });

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader
        title="Proposals"
        subtitle="Review generated work and add the useful pieces to your board."
      />
      <SegmentedControl onChange={setView} options={moreOptions} value={view} />
      <View style={styles.filterRow}>
        <Badge tone="primary">{proposals.length} total</Badge>
        <Badge tone={pendingCount > 0 ? "accent" : "success"}>{pendingCount} pending</Badge>
      </View>
    </View>
  );

  if (proposalsQuery.isPending || boardQuery.isPending) {
    return <LoadingState message="Loading proposals" />;
  }

  if (proposalsQuery.isError || boardQuery.isError) {
    return (
      <EmptyState
        title="Proposals unavailable"
        message="Careeright could not load your proposal library."
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        ListEmptyComponent={
          <EmptyState title="No proposals yet" message="AI and MCP proposal drafts appear here." />
        }
        ListHeaderComponent={header}
        contentContainerStyle={[styles.listContent, listContentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        data={proposals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProposalCard
            existingFingerprints={existingFingerprints}
            isBusy={
              proposalActionMutation.isPending ||
              addTaskMutation.isPending ||
              addAllMutation.isPending
            }
            onAccept={() =>
              proposalActionMutation.mutate({
                action: "accept",
                proposalId: item.id,
              })
            }
            onAddAll={() => addAllMutation.mutate(item)}
            onAddTask={(task) => addTaskMutation.mutate({ proposal: item, task })}
            onDelete={() =>
              Alert.alert("Delete proposal?", item.title, [
                { style: "cancel", text: "Cancel" },
                {
                  onPress: () =>
                    proposalActionMutation.mutate({
                      action: "delete",
                      proposalId: item.id,
                    }),
                  style: "destructive",
                  text: "Delete",
                },
              ])
            }
            onReject={() =>
              proposalActionMutation.mutate({
                action: "reject",
                proposalId: item.id,
              })
            }
            proposal={item}
          />
        )}
      />
    </View>
  );
}

function McpView({
  setView,
  view,
}: {
  setView: (view: MoreView) => void;
  view: MoreView;
}) {
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const [tokenName, setTokenName] = useState("Careeright mobile token");
  const [latestToken, setLatestToken] = useState<string | null>(null);
  const tokensQuery = useQuery({
    queryKey: mcpTokensQueryKey,
    queryFn: () => rpcClient.mcpToken.list(),
  });

  const createTokenMutation = useMutation({
    mutationFn: () => rpcClient.mcpToken.create({ name: tokenName }),
    onError: showMutationError("Could not create token"),
    onSuccess: async (result) => {
      setLatestToken(result.token);
      await Clipboard.setStringAsync(result.token);
      successImpact();
      await queryClient.invalidateQueries({ queryKey: mcpTokensQueryKey });
      Alert.alert("Token copied", "The new MCP token was copied to the clipboard.");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => rpcClient.mcpToken.revoke({ tokenId }),
    onError: showMutationError("Could not revoke token"),
    onSuccess: async () => {
      warningImpact();
      await queryClient.invalidateQueries({ queryKey: mcpTokensQueryKey });
    },
  });

  return (
    <ScreenScroll tabBar>
      <ScreenHeader
        title="MCP tools"
        subtitle="Manage tokens for external AI clients that work with Careeright."
      />
      <SegmentedControl onChange={setView} options={moreOptions} value={view} />
      <Card>
        <SectionTitle title="Connection" />
        <Text style={[styles.mutedText, { color: colors.textMuted }]}>
          Server: {getCareerightOrigin()}
        </Text>
        <Text style={[styles.mutedText, { color: colors.textMuted }]}>
          Auth: Bearer token via MCP client
        </Text>
      </Card>
      <Card>
        <SectionTitle title="Create token" subtitle="The raw token is shown once and copied automatically." />
        <TextField label="Name" onChangeText={setTokenName} value={tokenName} />
        <Button loading={createTokenMutation.isPending} onPress={() => createTokenMutation.mutate()}>
          <KeyRound color="#FFFFFF" size={16} /> Create token
        </Button>
        {latestToken ? (
          <Button
            onPress={() => {
              Clipboard.setStringAsync(latestToken);
              successImpact();
            }}
            variant="secondary"
          >
            <Copy size={16} /> Copy newest token
          </Button>
        ) : null}
      </Card>
      <SectionTitle title="Tokens" />
      {tokensQuery.isPending ? (
        <LoadingState message="Loading tokens" />
      ) : (tokensQuery.data ?? []).length === 0 ? (
        <EmptyState title="No MCP tokens" message="Create a token when connecting an AI client." />
      ) : (
        (tokensQuery.data ?? []).map((token) => (
          <Card key={token.id}>
            <View style={styles.taskTopRow}>
              <Badge tone={token.revokedAt ? "danger" : "success"}>
                {token.revokedAt ? "Revoked" : "Active"}
              </Badge>
              <Text style={[styles.mutedText, { color: colors.textMuted }]}>
                {formatLongDate(token.createdAt)}
              </Text>
            </View>
            <Text style={[styles.itemTitle, { color: colors.text }]}>
              {token.name}
            </Text>
            <Text style={[styles.mutedText, { color: colors.textMuted }]}>
              {token.tokenPrefix}
            </Text>
            <Button
              disabled={Boolean(token.revokedAt) || revokeMutation.isPending}
              onPress={() =>
                Alert.alert("Revoke token?", token.name, [
                  { style: "cancel", text: "Cancel" },
                  {
                    onPress: () => revokeMutation.mutate(token.id),
                    style: "destructive",
                    text: "Revoke",
                  },
                ])
              }
              variant="danger"
            >
              Revoke
            </Button>
          </Card>
        ))
      )}
    </ScreenScroll>
  );
}

function SettingsView({
  setView,
  view,
}: {
  setView: (view: MoreView) => void;
  view: MoreView;
}) {
  const { colors, mode, setMode } = useAppTheme();
  const origin = getCareerightOrigin();

  return (
    <ScreenScroll tabBar>
      <ScreenHeader
        title="Settings"
        subtitle="Keep the app comfortable and connected to the right backend."
      />
      <SegmentedControl onChange={setView} options={moreOptions} value={view} />
      <Card>
        <SectionTitle title="Theme" />
        <SegmentedControl
          onChange={setMode}
          options={[
            { label: "System", value: "system" },
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
          ]}
          value={mode}
        />
      </Card>
      <Card>
        <SectionTitle title="Backend" />
        <Text style={[styles.mutedText, { color: colors.textMuted }]}>
          {origin}
        </Text>
      </Card>
      <Card>
        <SectionTitle
          title="Privacy and data"
          subtitle="Review policy details or request account data deletion."
        />
        <View style={styles.taskActions}>
          <Button
            onPress={() => openExternalUrl(`${origin}/privacy`)}
            variant="secondary"
          >
            <ExternalLink size={16} /> Privacy policy
          </Button>
          <Button
            onPress={() => openExternalUrl(`${origin}/data-deletion`)}
            variant="ghost"
          >
            <ExternalLink size={16} /> Data deletion
          </Button>
        </View>
      </Card>
      <Card>
        <SectionTitle title="Account" />
        <Button
          onPress={() => {
            authClient.signOut();
            warningImpact();
          }}
          variant="danger"
        >
          <LogOut color="#FFFFFF" size={16} /> Sign out
        </Button>
      </Card>
    </ScreenScroll>
  );
}

function ProfileItemCard({
  item,
  onDelete,
}: {
  item: ProfileItem;
  onDelete: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Card>
      <View style={styles.taskTopRow}>
        <Badge tone="primary">{titleCase(item.type)}</Badge>
        <Pressable onPress={onDelete}>
          <Trash2 color={colors.danger} size={16} />
        </Pressable>
      </View>
      <Text style={[styles.itemTitle, { color: colors.text }]}>
        {item.title}
      </Text>
      {item.organization ? (
        <Text style={[styles.mutedText, { color: colors.textMuted }]}>
          {item.organization}
        </Text>
      ) : null}
      {item.description ? (
        <Text style={[styles.mutedText, { color: colors.textMuted }]}>
          {item.description}
        </Text>
      ) : null}
    </Card>
  );
}

function ImportCard({
  isBusy,
  onApply,
  onReject,
  profileImport,
}: {
  isBusy: boolean;
  onApply: () => void;
  onReject: () => void;
  profileImport: ProfileImport;
}) {
  const { colors } = useAppTheme();

  return (
    <Card>
      <View style={styles.taskTopRow}>
        <Badge tone="accent">{profileImport.source}</Badge>
        <Text style={[styles.mutedText, { color: colors.textMuted }]}>
          {formatLongDate(profileImport.createdAt)}
        </Text>
      </View>
      <Text style={[styles.itemTitle, { color: colors.text }]}>
        {profileImport.summary || "Resume import"}
      </Text>
      <Text style={[styles.mutedText, { color: colors.textMuted }]}>
        {profileImport.items.length} profile items
      </Text>
      <View style={styles.taskActions}>
        <Button disabled={isBusy} onPress={onApply}>
          <CheckCircle2 color="#FFFFFF" size={16} /> Apply
        </Button>
        <Button disabled={isBusy} onPress={onReject} variant="secondary">
          <XCircle size={16} /> Reject
        </Button>
      </View>
    </Card>
  );
}

function ProposalCard({
  existingFingerprints,
  isBusy,
  onAccept,
  onAddAll,
  onAddTask,
  onDelete,
  onReject,
  proposal,
}: {
  existingFingerprints: Set<string>;
  isBusy: boolean;
  onAccept: () => void;
  onAddAll: () => void;
  onAddTask: (task: ProposedTask) => void;
  onDelete: () => void;
  onReject: () => void;
  proposal: AiProposal;
}) {
  const { colors } = useAppTheme();
  const remaining = remainingProposalTasks(proposal, existingFingerprints);

  return (
    <Card style={styles.proposalCard}>
      <View style={styles.taskTopRow}>
        <Badge tone={proposal.status === "pending" ? "accent" : "default"}>
          {titleCase(proposal.status)}
        </Badge>
        <Badge tone="violet">{titleCase(proposal.source)}</Badge>
      </View>
      <Text selectable style={[styles.proposalTitle, { color: colors.text }]}>
        {proposal.title}
      </Text>
      <Text selectable style={[styles.mutedText, { color: colors.textMuted }]}>
        {proposal.summary}
      </Text>
      {proposal.type === "task_breakdown" && "tasks" in proposal.payload ? (
        <View style={styles.proposedTaskList}>
          <View style={styles.taskTopRow}>
            <Text style={[styles.mutedText, { color: colors.textMuted }]}>
              {remaining.length} tasks not added
            </Text>
            <Button disabled={isBusy || remaining.length === 0} onPress={onAddAll} variant="secondary">
              Add all
            </Button>
          </View>
          {proposal.payload.tasks.slice(0, 4).map((task) => {
            const isAdded = existingFingerprints.has(taskFingerprint(task));

            return (
              <View key={taskFingerprint(task)} style={styles.proposedTaskRow}>
                <View style={styles.proposedTaskCopy}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {task.title}
                  </Text>
                  <Text style={[styles.mutedText, { color: colors.textMuted }]}>
                    {task.description}
                  </Text>
                </View>
                <Button
                  disabled={isBusy || isAdded}
                  onPress={() => onAddTask(task)}
                  variant={isAdded ? "secondary" : "primary"}
                >
                  {isAdded ? "Added" : "Add"}
                </Button>
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={styles.taskActions}>
        {proposal.status === "pending" ? (
          <>
            <Button disabled={isBusy} onPress={onAccept}>
              Accept
            </Button>
            <Button disabled={isBusy} onPress={onReject} variant="secondary">
              Reject
            </Button>
          </>
        ) : null}
        <Button disabled={isBusy} onPress={onDelete} variant="danger">
          Delete
        </Button>
      </View>
    </Card>
  );
}

function ProfileTextField({
  basics,
  field,
  label,
  multiline,
  setBasics,
}: {
  basics: ProfileBasicsDraft;
  field: keyof ProfileBasicsDraft;
  label: string;
  multiline?: boolean;
  setBasics: React.Dispatch<React.SetStateAction<ProfileBasicsDraft>>;
}) {
  return (
    <TextField
      label={label}
      multiline={multiline}
      onChangeText={(value) =>
        setBasics((current) => ({
          ...current,
          [field]: value,
        }))
      }
      value={String(basics[field] ?? "")}
    />
  );
}

function DefaultsField({
  defaults,
  field,
  label,
  setDefaults,
}: {
  defaults: ProfileApplicationDefaults;
  field: keyof ProfileApplicationDefaults;
  label: string;
  setDefaults: React.Dispatch<React.SetStateAction<ProfileApplicationDefaults>>;
}) {
  return (
    <TextField
      label={label}
      onChangeText={(value) =>
        setDefaults((current) => ({
          ...current,
          [field]: field === "joiningAvailabilityDays" ? Number(value) : value,
        }))
      }
      value={String(defaults[field] ?? "")}
    />
  );
}

function snapshotToBasics(snapshot: ProfileSnapshot): ProfileBasicsDraft {
  return {
    displayName: snapshot.profile.displayName,
    email: snapshot.profile.email,
    headline: snapshot.profile.headline,
    location: snapshot.profile.location,
    summary: snapshot.profile.summary,
    website: snapshot.profile.website,
  };
}

const emptyProfileBasics: ProfileBasicsDraft = {
  displayName: "",
  email: "",
  headline: "",
  location: "",
  summary: "",
  website: "",
};

const emptyApplicationDefaults: ProfileApplicationDefaults = {
  branch: "",
  college: "",
  defaultSource: "",
  gender: "",
  graduationPercentage: "",
  graduationYear: "",
  joiningAvailabilityDays: null,
  linkedinUrl: "",
  phone: "",
  resumeLocalPath: "",
  xBoard: "",
  xPercentage: "",
  xiiBoard: "",
  xiiPercentage: "",
};

function showMutationError(title: string) {
  return (error: unknown) => {
    Alert.alert(title, error instanceof Error ? error.message : "Please try again.");
  };
}

function remainingProposalTasks(
  proposal: AiProposal,
  existingFingerprints: Set<string>,
) {
  if (proposal.type !== "task_breakdown" || !("tasks" in proposal.payload)) {
    return [];
  }

  return proposal.payload.tasks.filter(
    (task) => !existingFingerprints.has(taskFingerprint(task)),
  );
}

function proposedTaskInput(proposal: AiProposal, task: ProposedTask) {
  return {
    acceptanceCriteria: task.acceptanceCriteria,
    columnId: "todo" as const,
    dependencies: task.dependencies,
    description: task.description,
    helpfulLinks: task.helpfulLinks,
    priority: task.priority,
    problemLinks: task.problemLinks,
    resourceLinks: task.resourceLinks,
    sourceProposalId: proposal.id,
    sourceProposalItemFingerprint: taskFingerprint(task),
    sourceProposalTopic: proposal.title,
    title: task.title,
  };
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  headerWrap: {
    gap: spacing.four,
    marginBottom: spacing.three,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  listContent: {
    padding: spacing.four,
    paddingBottom: spacing.seven,
  },
  mutedText: {
    fontSize: 13,
    lineHeight: 19,
  },
  proposalCard: {
    marginBottom: spacing.three,
  },
  proposalTitle: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25,
  },
  proposedTaskCopy: {
    flex: 1,
    gap: spacing.one,
  },
  proposedTaskList: {
    gap: spacing.three,
  },
  proposedTaskRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.three,
  },
  screen: {
    flex: 1,
  },
  taskActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  taskTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
    justifyContent: "space-between",
  },
});
