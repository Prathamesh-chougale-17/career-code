"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Briefcase,
  Check,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trophy,
  Trash2,
  Upload,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import { Textarea } from "../ui/textarea";
import type {
  CreateProfileItemInput,
  ProfileApplicationDefaults,
  ProfileImport,
  ProfileItem,
  ProfileItemType,
  ProfileSnapshot,
  UpdateProfileApplicationDefaultsInput,
  UserProfile,
} from "@careeright/domain/profile/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import {
  profileImportsQueryKey,
  profileSnapshotQueryKey,
} from "@careeright/api/query-keys";
import { scheduleIdleTask } from "../../lib/schedule-idle-task";
import { cn } from "../../lib/utils";

type ProfileBasicsDraft = {
  displayName: string;
  headline: string;
  location: string;
  email: string;
  website: string;
  summary: string;
};

type ProfileItemDraft = {
  type: ProfileItemType;
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  url: string;
  tagsText: string;
};

type ApplicationDefaultsDraft = Omit<
  ProfileApplicationDefaults,
  "joiningAvailabilityDays"
> & {
  joiningAvailabilityDays: string;
};

type ProfileItemDialogState =
  | {
      mode: "create";
      type: ProfileItemType;
    }
  | {
      mode: "edit";
      item: ProfileItem;
    };

type ResumePdfImportResponse = {
  profileImport: ProfileImport;
  warnings: string[];
  textLength: number;
};

type ResumePdfImportMessage = {
  type: "success" | "error";
  message: string;
  warnings?: string[];
};

type ProfileSectionConfig = {
  type: ProfileItemType;
  label: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
};

const profileSections = [
  {
    type: "experience",
    label: "Experience",
    description: "Roles, internships, freelance work, and leadership history.",
    emptyTitle: "No experience yet",
    emptyDescription: "Add your first role when you are ready.",
    icon: Briefcase,
  },
  {
    type: "education",
    label: "Education",
    description: "Degrees, schools, coursework, and training programs.",
    emptyTitle: "No education yet",
    emptyDescription: "Add schools, programs, or academic milestones.",
    icon: GraduationCap,
  },
  {
    type: "project",
    label: "Projects",
    description: "Portfolio work, shipped products, research, and demos.",
    emptyTitle: "No projects yet",
    emptyDescription: "Add a project with the outcome and tech stack.",
    icon: FolderOpen,
  },
  {
    type: "skill",
    label: "Skills",
    description: "Technologies, tools, languages, and strengths.",
    emptyTitle: "No skills yet",
    emptyDescription: "Add a skill or group related skills with tags.",
    icon: Wrench,
  },
  {
    type: "certification",
    label: "Certifications",
    description: "Certificates, credentials, licenses, and course completions.",
    emptyTitle: "No certifications yet",
    emptyDescription: "Add credentials, issuers, and verification links.",
    icon: Award,
  },
  {
    type: "achievement",
    label: "Achievements",
    description: "Hackathons, rankings, competitive milestones, and honors.",
    emptyTitle: "No achievements yet",
    emptyDescription: "Add awards, rankings, and notable accomplishments.",
    icon: Trophy,
  },
] satisfies ProfileSectionConfig[];

const sectionLabels = Object.fromEntries(
  profileSections.map((section) => [section.type, section.label]),
) as Record<ProfileItemType, string>;

const profileBasicLabels = {
  displayName: "Name",
  headline: "Headline",
  location: "Location",
  email: "Email",
  website: "Website",
  summary: "Summary",
} satisfies Record<keyof ProfileBasicsDraft, string>;

export function ProfileApp({
  initialSnapshot,
  initialImports,
}: {
  initialSnapshot?: ProfileSnapshot;
  initialImports?: ProfileImport[];
}) {
  const { rpcClient, uploadResume } = useCareerightUi();
  const queryClient = useQueryClient();
  const [dialogState, setDialogState] =
    useState<ProfileItemDialogState | null>(null);
  const [resumeImportMessage, setResumeImportMessage] =
    useState<ResumePdfImportMessage | null>(null);
  const [shouldLoadImports, setShouldLoadImports] = useState(
    initialImports !== undefined,
  );

  const snapshotQuery = useQuery({
    queryKey: profileSnapshotQueryKey,
    queryFn: () => rpcClient.profile.snapshot(),
    initialData: initialSnapshot,
    notifyOnChangeProps: ["data", "isPending", "isError", "error"],
    staleTime: 60_000,
  });

  const importsQuery = useQuery({
    queryKey: profileImportsQueryKey,
    queryFn: () => rpcClient.profileImport.list(),
    enabled: shouldLoadImports,
    initialData: initialImports,
    notifyOnChangeProps: ["data", "isPending"],
    staleTime: 60_000,
  });

  useEffect(() => {
    if (shouldLoadImports) {
      return;
    }

    return scheduleIdleTask(() => setShouldLoadImports(true), {
      fallbackDelay: 500,
      timeout: 1500,
    });
  }, [shouldLoadImports]);

  const invalidateProfile = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: profileSnapshotQueryKey }),
      queryClient.invalidateQueries({ queryKey: profileImportsQueryKey }),
    ]);

  const updateProfileMutation = useMutation({
    mutationFn: (input: ProfileBasicsDraft) => rpcClient.profile.update(input),
    onSuccess: () => void invalidateProfile(),
  });

  const updateApplicationDefaultsMutation = useMutation({
    mutationFn: (input: UpdateProfileApplicationDefaultsInput) =>
      rpcClient.profile.updateApplicationDefaults(input),
    onSuccess: () => void invalidateProfile(),
  });

  const createItemMutation = useMutation({
    mutationFn: (input: CreateProfileItemInput) =>
      rpcClient.profile.createItem(input),
    onSuccess: () => {
      setDialogState(null);
      void invalidateProfile();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      input,
    }: {
      itemId: string;
      input: CreateProfileItemInput;
    }) =>
      rpcClient.profile.updateItem({
        itemId,
        patch: input,
      }),
    onSuccess: () => {
      setDialogState(null);
      void invalidateProfile();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      rpcClient.profile.deleteItem({
        itemId,
      }),
    onSuccess: () => void invalidateProfile(),
  });

  const applyImportMutation = useMutation({
    mutationFn: (importId: string) =>
      rpcClient.profileImport.apply({
        importId,
      }),
    onSuccess: () => void invalidateProfile(),
  });

  const rejectImportMutation = useMutation({
    mutationFn: (importId: string) =>
      rpcClient.profileImport.reject({
        importId,
      }),
    onSuccess: () => void invalidateProfile(),
  });

  const resumePdfImportMutation = useMutation({
    mutationFn: (file: File) => uploadResume(file) as Promise<ResumePdfImportResponse>,
    onSuccess: (result) => {
      setResumeImportMessage({
        type: "success",
        message: `Created a pending PDF import with ${result.profileImport.items.length} items.`,
        warnings: result.warnings,
      });
      void invalidateProfile();
    },
    onError: (error) => {
      setResumeImportMessage({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Resume PDF import failed.",
      });
    },
  });

  const snapshot = snapshotQuery.data;
  const pendingImports = importsQuery.data ?? [];

  const itemsByType = useMemo(
    () => groupItemsByType(snapshot?.items ?? []),
    [snapshot?.items],
  );
  const dialogKey =
    dialogState?.mode === "edit"
      ? dialogState.item.id
      : `${dialogState?.mode ?? "closed"}-${dialogState?.type ?? "none"}`;

  function handleSaveItem(draft: ProfileItemDraft) {
    const input = draftToProfileItemInput(draft);

    if (dialogState?.mode === "edit") {
      updateItemMutation.mutate({
        itemId: dialogState.item.id,
        input,
      });
      return;
    }

    createItemMutation.mutate(input);
  }

  if (snapshotQuery.isPending) {
    return (
      <>
        <ProfileHeader subtitle="Loading profile workspace" />
        <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
            <ProfileSkeleton />
          </div>
        </main>
      </>
    );
  }

  if (snapshotQuery.isError || !snapshot) {
    return (
      <>
        <ProfileHeader subtitle="Profile workspace" />
        <main className="flex min-h-svh items-center justify-center px-6 text-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Profile could not load</CardTitle>
              <CardDescription>
                {snapshotQuery.error instanceof Error
                  ? snapshotQuery.error.message
                  : "Something went wrong while loading your profile."}
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <ProfileHeader
        subtitle={`${snapshot.items.length} saved profile ${
          snapshot.items.length === 1 ? "item" : "items"
        }`}
      />

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
          <ResumePdfImportCard
            isImporting={resumePdfImportMutation.isPending}
            message={resumeImportMessage}
            onImport={(file) => resumePdfImportMutation.mutate(file)}
            onClearMessage={() => setResumeImportMessage(null)}
          />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
            <ProfileBasicsCard
              key={snapshot.profile.updatedAt}
              profile={snapshot.profile}
              isSaving={updateProfileMutation.isPending}
              onSubmit={(draft) => updateProfileMutation.mutate(draft)}
            />
            <ProfileOverviewCard
              profile={snapshot.profile}
              items={snapshot.items}
            />
          </section>

          <ApplicationDefaultsCard
            key={`application-defaults-${snapshot.profile.updatedAt}`}
            defaults={snapshot.profile.applicationDefaults}
            isSaving={updateApplicationDefaultsMutation.isPending}
            onSubmit={(draft) =>
              updateApplicationDefaultsMutation.mutate(
                draftToApplicationDefaultsInput(draft),
              )
            }
          />

          <ProfileImportReview
            imports={pendingImports}
            isLoading={importsQuery.isPending}
            busyImportId={
              applyImportMutation.isPending
                ? applyImportMutation.variables
                : rejectImportMutation.isPending
                  ? rejectImportMutation.variables
                  : undefined
            }
            onApply={(importId) => applyImportMutation.mutate(importId)}
            onReject={(importId) => rejectImportMutation.mutate(importId)}
          />

          <section className="grid gap-4 lg:grid-cols-2">
            {profileSections.map((section) => (
              <ProfileSectionCard
                key={section.type}
                section={section}
                items={itemsByType[section.type]}
                deletingItemId={
                  deleteItemMutation.isPending
                    ? deleteItemMutation.variables
                    : undefined
                }
                onAdd={() =>
                  setDialogState({
                    mode: "create",
                    type: section.type,
                  })
                }
                onEdit={(item) =>
                  setDialogState({
                    mode: "edit",
                    item,
                  })
                }
                onDelete={(itemId) => deleteItemMutation.mutate(itemId)}
              />
            ))}
          </section>
        </div>
      </main>

      {dialogState ? (
        <ProfileItemDialog
          key={dialogKey}
          state={dialogState}
          isSaving={createItemMutation.isPending || updateItemMutation.isPending}
          onClose={() => setDialogState(null)}
          onSave={handleSaveItem}
        />
      ) : null}
    </>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <Card size="sm">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-xl" />
              <Skeleton className="h-5 w-28 rounded-md" />
            </div>
            <Skeleton className="h-4 w-80 max-w-full rounded-md" />
            <CardAction>
              <Skeleton className="h-9 w-20 rounded-md" />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <ProfileFieldSkeleton key={index} />
              ))}
            </div>
            <ProfileFieldSkeleton />
            <ProfileFieldSkeleton className="h-36" />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-6 w-48 rounded-md" />
                  <Skeleton className="h-4 w-64 max-w-full rounded-md" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
              </div>
              <Skeleton className="mt-4 h-16 w-full rounded-lg" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="mt-2 h-6 w-12 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} size="sm" className="min-w-0">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-xl" />
                <Skeleton className="h-5 w-36 rounded-md" />
              </div>
              <Skeleton className="h-4 w-72 max-w-full rounded-md" />
              <CardAction className="flex items-center gap-2">
                <Skeleton className="h-6 w-10 rounded-full" />
                <Skeleton className="size-8 rounded-md" />
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Skeleton className="h-48 rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

function ProfileFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-4 w-20 rounded-md" />
      <Skeleton className={cn("h-10 rounded-md", className)} />
    </div>
  );
}

function ProfileHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">Profile</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </header>
  );
}

function ResumePdfImportCard({
  isImporting,
  message,
  onImport,
  onClearMessage,
}: {
  isImporting: boolean;
  message: ResumePdfImportMessage | null;
  onImport: (file: File) => void;
  onClearMessage: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (file) {
      onImport(file);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileText aria-hidden="true" />
          </span>
          Resume PDF import
        </CardTitle>
        <CardDescription>
          Free local extraction for selectable PDF resumes. No AI key required.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <Input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              onClearMessage();
            }}
          />
          <Button type="submit" disabled={!file || isImporting}>
            {isImporting ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Upload data-icon="inline-start" aria-hidden="true" />
            )}
            Parse PDF
          </Button>
        </form>

        {message ? (
          <div
            role="status"
            className={`rounded-xl border p-4 ${
              message.type === "success"
                ? "border-primary/25 bg-primary/5"
                : "border-destructive/25 bg-destructive/10 text-destructive"
            }`}
          >
            <p className="text-sm font-medium">{message.message}</p>
            {message.warnings?.length ? (
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {message.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProfileBasicsCard({
  profile,
  isSaving,
  onSubmit,
}: {
  profile: UserProfile;
  isSaving: boolean;
  onSubmit: (draft: ProfileBasicsDraft) => void;
}) {
  const [draft, setDraft] = useState(() => profileToBasicsDraft(profile));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <UserRound aria-hidden="true" />
          </span>
          Basic info
        </CardTitle>
        <CardDescription>
          Name, headline, contact links, and a short profile summary.
        </CardDescription>
        <CardAction>
          <Button type="submit" form="profile-basics-form" disabled={isSaving}>
            {isSaving ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save data-icon="inline-start" aria-hidden="true" />
            )}
            Save
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form id="profile-basics-form" onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  value={draft.displayName}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      displayName: event.target.value,
                    })
                  }
                  placeholder="Your name"
                />
              </Field>
              <Field>
                <FieldLabel>Headline</FieldLabel>
                <Input
                  value={draft.headline}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      headline: event.target.value,
                    })
                  }
                  placeholder="Frontend engineer, student, designer"
                />
              </Field>
              <Field>
                <FieldLabel>Location</FieldLabel>
                <Input
                  value={draft.location}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      location: event.target.value,
                    })
                  }
                  placeholder="City, country"
                />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  value={draft.email}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      email: event.target.value,
                    })
                  }
                  placeholder="you@example.com"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Website</FieldLabel>
              <Input
                value={draft.website}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    website: event.target.value,
                  })
                }
                placeholder="https://your-site.com"
              />
            </Field>
            <Field>
              <FieldLabel>Summary</FieldLabel>
              <Textarea
                value={draft.summary}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    summary: event.target.value,
                  })
                }
                rows={6}
                placeholder="A concise profile summary"
              />
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function ApplicationDefaultsCard({
  defaults,
  isSaving,
  onSubmit,
}: {
  defaults: ProfileApplicationDefaults;
  isSaving: boolean;
  onSubmit: (draft: ApplicationDefaultsDraft) => void;
}) {
  const [draft, setDraft] = useState(() =>
    applicationDefaultsToDraft(defaults),
  );

  function updateField(field: keyof ApplicationDefaultsDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Briefcase aria-hidden="true" />
          </span>
          Application defaults
        </CardTitle>
        <CardDescription>
          Saved answers used by the latest-batch Chrome application runner.
        </CardDescription>
        <CardAction>
          <Button
            type="submit"
            form="application-defaults-form"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save data-icon="inline-start" aria-hidden="true" />
            )}
            Save
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form id="application-defaults-form" onSubmit={handleSubmit}>
          <FieldGroup className="gap-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <ApplicationDefaultsField
                label="Phone"
                value={draft.phone}
                onChange={(value) => updateField("phone", value)}
                placeholder="+91 ..."
              />
              <ApplicationDefaultsField
                label="Gender"
                value={draft.gender}
                onChange={(value) => updateField("gender", value)}
                placeholder="Male, female, other"
              />
              <ApplicationDefaultsField
                label="Source"
                value={draft.defaultSource}
                onChange={(value) => updateField("defaultSource", value)}
                placeholder="LinkedIn, referral, careers page"
              />
              <ApplicationDefaultsField
                label="Joining availability"
                type="number"
                value={draft.joiningAvailabilityDays}
                onChange={(value) =>
                  updateField("joiningAvailabilityDays", value)
                }
                placeholder="60"
              />
              <ApplicationDefaultsField
                label="LinkedIn"
                value={draft.linkedinUrl}
                onChange={(value) => updateField("linkedinUrl", value)}
                placeholder="https://linkedin.com/in/..."
              />
              <ApplicationDefaultsField
                label="Resume path"
                value={draft.resumeLocalPath}
                onChange={(value) => updateField("resumeLocalPath", value)}
                placeholder="C:\\Users\\...\\Resume.pdf"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <ApplicationDefaultsField
                label="College"
                value={draft.college}
                onChange={(value) => updateField("college", value)}
                placeholder="College or university"
              />
              <ApplicationDefaultsField
                label="Branch"
                value={draft.branch}
                onChange={(value) => updateField("branch", value)}
                placeholder="Computer Science"
              />
              <ApplicationDefaultsField
                label="Graduation year"
                value={draft.graduationYear}
                onChange={(value) => updateField("graduationYear", value)}
                placeholder="2026"
              />
              <ApplicationDefaultsField
                label="Graduation %"
                value={draft.graduationPercentage}
                onChange={(value) =>
                  updateField("graduationPercentage", value)
                }
                placeholder="78"
              />
              <ApplicationDefaultsField
                label="XII board"
                value={draft.xiiBoard}
                onChange={(value) => updateField("xiiBoard", value)}
                placeholder="HSC, CBSE, ISC"
              />
              <ApplicationDefaultsField
                label="XII %"
                value={draft.xiiPercentage}
                onChange={(value) => updateField("xiiPercentage", value)}
                placeholder="84"
              />
              <ApplicationDefaultsField
                label="X board"
                value={draft.xBoard}
                onChange={(value) => updateField("xBoard", value)}
                placeholder="SSC, CBSE, ICSE"
              />
              <ApplicationDefaultsField
                label="X %"
                value={draft.xPercentage}
                onChange={(value) => updateField("xPercentage", value)}
                placeholder="78"
              />
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function ApplicationDefaultsField({
  label,
  value,
  type = "text",
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  type?: "number" | "text";
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 365 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </Field>
  );
}

function ProfileOverviewCard({
  profile,
  items,
}: {
  profile: UserProfile;
  items: ProfileItem[];
}) {
  const counts = countItemsByType(items);
  const hasIdentity = Boolean(
    profile.displayName || profile.headline || profile.summary,
  );

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>
          {hasIdentity
            ? "Your current profile at a glance."
            : "Add basic info to shape your profile."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-xl border border-border bg-background/70 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UserRound aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="break-words font-heading text-xl font-semibold">
                {profile.displayName || "Untitled profile"}
              </h2>
              {profile.headline ? (
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {profile.headline}
                </p>
              ) : null}
              {profile.location ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden="true" />
                  <span className="break-words">{profile.location}</span>
                </p>
              ) : null}
            </div>
          </div>

          {profile.summary ? (
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
              {profile.summary}
            </p>
          ) : null}

          {profile.website ? (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <span className="truncate">{profile.website}</span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            </a>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {profileSections.map((section) => (
            <div
              key={section.type}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{section.label}</p>
              <p className="font-heading text-xl font-medium">
                {counts[section.type]}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileImportReview({
  imports,
  isLoading,
  busyImportId,
  onApply,
  onReject,
}: {
  imports: ProfileImport[];
  isLoading: boolean;
  busyImportId?: string;
  onApply: (importId: string) => void;
  onReject: (importId: string) => void;
}) {
  if (isLoading) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText aria-hidden="true" />
            Resume imports
          </CardTitle>
          <CardDescription>Checking for pending imports.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (imports.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      {imports.map((profileImport) => (
        <ProfileImportCard
          key={profileImport.id}
          profileImport={profileImport}
          isBusy={busyImportId === profileImport.id}
          onApply={() => onApply(profileImport.id)}
          onReject={() => onReject(profileImport.id)}
        />
      ))}
    </section>
  );
}

function ProfileImportCard({
  profileImport,
  isBusy,
  onApply,
  onReject,
}: {
  profileImport: ProfileImport;
  isBusy: boolean;
  onApply: () => void;
  onReject: () => void;
}) {
  const basics = Object.entries(profileImport.profileBasics).filter(
    ([, value]) => Boolean(value),
  ) as Array<[keyof ProfileBasicsDraft, string]>;
  const importedItemsByType = groupImportedItemsByType(profileImport.items);

  return (
    <Card size="sm" className="border-primary/25 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileText aria-hidden="true" />
          </span>
          Resume import
        </CardTitle>
        <CardDescription>
          {profileImport.summary || `Received ${formatDate(profileImport.createdAt)}`}
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Badge variant="outline">{profileImport.items.length} items</Badge>
          <Badge variant="outline">{profileImport.source}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {basics.length > 0 ? (
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <p className="text-sm font-medium">Basic info</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {basics.map(([field, value]) => (
                <div
                  key={field}
                  className="min-w-0 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <p className="text-xs text-muted-foreground">
                    {profileBasicLabels[field]}
                  </p>
                  <p className="truncate text-sm font-medium text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          {profileSections.map((section) => {
            const items = importedItemsByType[section.type];

            if (items.length === 0) {
              return null;
            }

            return (
              <div
                key={section.type}
                className="rounded-xl border border-border bg-background/70 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{section.label}</p>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <div className="grid gap-2">
                  {items.map((item, index) => (
                    <ImportedProfileItemRow
                      key={`${item.type}-${item.title}-${index}`}
                      item={item}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t bg-background/80 pt-4">
        <Button type="button" onClick={onApply} disabled={isBusy}>
          {isBusy ? (
            <Loader2
              data-icon="inline-start"
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Check data-icon="inline-start" aria-hidden="true" />
          )}
          Apply import
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReject}
          disabled={isBusy}
        >
          <X data-icon="inline-start" aria-hidden="true" />
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
}

function ImportedProfileItemRow({
  item,
}: {
  item: ProfileImport["items"][number];
}) {
  const dateRange = formatItemDateRange(item);
  const details = [item.organization, item.location, dateRange].filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{sectionLabels[item.type]}</Badge>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${item.title}`}
            title={`Open ${item.title}`}
            className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <p className="mt-2 break-words text-sm font-semibold">{item.title}</p>
      {details.length > 0 ? (
        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
          {details.join(" / ")}
        </p>
      ) : null}
      {item.description ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
          {item.description}
        </p>
      ) : null}
      {item.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileSectionCard({
  section,
  items,
  deletingItemId,
  onAdd,
  onEdit,
  onDelete,
}: {
  section: ProfileSectionConfig;
  items: ProfileItem[];
  deletingItemId?: string;
  onAdd: () => void;
  onEdit: (item: ProfileItem) => void;
  onDelete: (itemId: string) => void;
}) {
  const Icon = section.icon;

  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon aria-hidden="true" />
          </span>
          {section.label}
        </CardTitle>
        <CardDescription>{section.description}</CardDescription>
        <CardAction className="flex items-center gap-2">
          <Badge variant="outline">{items.length}</Badge>
          <Button
            type="button"
            size="icon-sm"
            aria-label={`Add ${section.label}`}
            title={`Add ${section.label}`}
            onClick={onAdd}
          >
            <Plus aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <Empty className="min-h-48 border bg-muted/30 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Icon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{section.emptyTitle}</EmptyTitle>
              <EmptyDescription>{section.emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <ProfileItemRow
                key={item.id}
                item={item}
                isDeleting={deletingItemId === item.id}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileItemRow({
  item,
  isDeleting,
  onEdit,
  onDelete,
}: {
  item: ProfileItem;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dateRange = formatItemDateRange(item);
  const details = [item.organization, item.location, dateRange].filter(Boolean);

  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{sectionLabels[item.type]}</Badge>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${item.title}`}
                title={`Open ${item.title}`}
                className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <h3 className="mt-2 break-words text-sm font-semibold leading-5">
            {item.title}
          </h3>
          {details.length > 0 ? (
            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
              {details.join(" / ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${item.title}`}
            title={`Edit ${item.title}`}
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            aria-label={`Delete ${item.title}`}
            title={`Delete ${item.title}`}
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {item.description ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
          {item.description}
        </p>
      ) : null}

      {item.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileItemDialog({
  state,
  isSaving,
  onClose,
  onSave,
}: {
  state: ProfileItemDialogState;
  isSaving: boolean;
  onClose: () => void;
  onSave: (draft: ProfileItemDraft) => void;
}) {
  const [draft, setDraft] = useState(() =>
    state.mode === "edit"
      ? itemToDraft(state.item)
      : createEmptyItemDraft(state.type),
  );
  const title =
    state.mode === "edit"
      ? `Edit ${sectionLabels[state.item.type]}`
      : `Add ${sectionLabels[state.type]}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (draft.title.trim()) {
      onSave(draft);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Save the details you want available in your profile.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)]">
              <Field>
                <FieldLabel>Section</FieldLabel>
                <Select
                  value={draft.type}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      type: value as ProfileItemType,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {profileSections.map((section) => (
                        <SelectItem key={section.type} value={section.type}>
                          {section.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Role, degree, project, skill, or credential"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Organization</FieldLabel>
                <Input
                  value={draft.organization}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      organization: event.target.value,
                    }))
                  }
                  placeholder="Company, school, issuer"
                />
              </Field>
              <Field>
                <FieldLabel>Location</FieldLabel>
                <Input
                  value={draft.location}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Remote, city, campus"
                />
              </Field>
              <Field>
                <FieldLabel>Start</FieldLabel>
                <Input
                  value={draft.startDate}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  placeholder="Jan 2024"
                />
              </Field>
              <Field>
                <FieldLabel>End</FieldLabel>
                <Input
                  value={draft.endDate}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  placeholder="Present"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Link</FieldLabel>
              <Input
                value={draft.url}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder="https://example.com"
              />
            </Field>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={5}
                placeholder="Highlights, outcomes, responsibilities, or context"
              />
            </Field>

            <Field>
              <FieldLabel>Tags</FieldLabel>
              <Input
                value={draft.tagsText}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tagsText: event.target.value,
                  }))
                }
                placeholder="React, MongoDB, system design"
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !draft.title.trim()}>
              {isSaving ? (
                <Loader2
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save data-icon="inline-start" aria-hidden="true" />
              )}
              Save item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function profileToBasicsDraft(profile: UserProfile): ProfileBasicsDraft {
  return {
    displayName: profile.displayName,
    headline: profile.headline,
    location: profile.location,
    email: profile.email,
    website: profile.website,
    summary: profile.summary,
  };
}

function applicationDefaultsToDraft(
  defaults: ProfileApplicationDefaults,
): ApplicationDefaultsDraft {
  return {
    ...defaults,
    joiningAvailabilityDays:
      defaults.joiningAvailabilityDays === null
        ? ""
        : String(defaults.joiningAvailabilityDays),
  };
}

function draftToApplicationDefaultsInput(
  draft: ApplicationDefaultsDraft,
): UpdateProfileApplicationDefaultsInput {
  const joiningAvailabilityDays = draft.joiningAvailabilityDays.trim();

  return {
    ...draft,
    joiningAvailabilityDays: joiningAvailabilityDays
      ? Number(joiningAvailabilityDays)
      : null,
  };
}

function createEmptyItemDraft(type: ProfileItemType): ProfileItemDraft {
  return {
    type,
    title: "",
    organization: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
    url: "",
    tagsText: "",
  };
}

function itemToDraft(item: ProfileItem): ProfileItemDraft {
  return {
    type: item.type,
    title: item.title,
    organization: item.organization,
    location: item.location,
    startDate: item.startDate,
    endDate: item.endDate,
    description: item.description,
    url: item.url,
    tagsText: item.tags.join(", "),
  };
}

function draftToProfileItemInput(
  draft: ProfileItemDraft,
): CreateProfileItemInput {
  return {
    type: draft.type,
    title: draft.title,
    organization: draft.organization,
    location: draft.location,
    startDate: draft.startDate,
    endDate: draft.endDate,
    description: draft.description,
    url: draft.url,
    tags: parseTags(draft.tagsText),
  };
}

function parseTags(value: string) {
  const tags = value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set(tags)].slice(0, 20);
}

function groupItemsByType(items: ProfileItem[]) {
  const grouped = profileSections.reduce(
    (result, section) => {
      result[section.type] = [];
      return result;
    },
    {} as Record<ProfileItemType, ProfileItem[]>,
  );

  for (const item of items) {
    grouped[item.type].push(item);
  }

  return grouped;
}

function groupImportedItemsByType(items: ProfileImport["items"]) {
  const grouped = profileSections.reduce(
    (result, section) => {
      result[section.type] = [];
      return result;
    },
    {} as Record<ProfileItemType, ProfileImport["items"]>,
  );

  for (const item of items) {
    grouped[item.type].push(item);
  }

  return grouped;
}

function countItemsByType(items: ProfileItem[]) {
  const counts = profileSections.reduce(
    (result, section) => {
      result[section.type] = 0;
      return result;
    },
    {} as Record<ProfileItemType, number>,
  );

  for (const item of items) {
    counts[item.type] += 1;
  }

  return counts;
}

function formatItemDateRange(item: Pick<ProfileItem, "startDate" | "endDate">) {
  if (item.startDate && item.endDate) {
    return `${item.startDate} - ${item.endDate}`;
  }

  return item.startDate || item.endDate;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}


