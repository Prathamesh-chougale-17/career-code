"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BookOpen,
  Boxes,
  CalendarDays,
  ExternalLink,
  FileText,
  FolderKanban,
  LinkIcon,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tags,
  Trash2,
} from "lucide-react";
import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  projectDetailQueryKey,
  projectsListQueryKey,
  projectsSummaryQueryKey,
} from "@careeright/api/query-keys";
import type {
  Project,
  ProjectAttribute,
  ProjectAttributeType,
  ProjectDetail,
  ProjectResource,
  ProjectResourceType,
  ProjectsSummary,
} from "@careeright/domain/projects/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { SidebarTrigger } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

type ProjectDraft = {
  title: string;
  summary: string;
  techStack: string;
  dateText: string;
};

type NoteDraft = {
  title: string;
  content: string;
};

type ResourceDraft = {
  title: string;
  url: string;
  type: ProjectResourceType;
  note: string;
};

type AttributeDraft = {
  label: string;
  aliases: string;
  type: ProjectAttributeType;
  dateValue: string;
  description: string;
  resourceIds: string[];
};

type ProjectDialogState =
  | { mode: "create"; project?: undefined }
  | { mode: "edit"; project: Project };

type ResourceDialogState =
  | { mode: "create"; resource?: undefined }
  | { mode: "edit"; resource: ProjectResource };

type AttributeDialogState =
  | { mode: "create"; attribute?: undefined }
  | { mode: "edit"; attribute: ProjectAttribute };

const projectStatusLabels = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
} satisfies Record<Project["status"], string>;

const resourceTypeLabels = {
  repository: "Repository",
  demo: "Demo",
  documentation: "Docs",
  article: "Article",
  video: "Video",
  design: "Design",
  link: "Link",
  other: "Other",
} satisfies Record<ProjectResourceType, string>;

const attributeTypeLabels = {
  technology: "Technology",
  concept: "Concept",
  date: "Date",
  person: "Person",
  link: "Link",
  other: "Other",
} satisfies Record<ProjectAttributeType, string>;

const resourceTypeOptions = Object.keys(
  resourceTypeLabels,
) as ProjectResourceType[];
const attributeTypeOptions = Object.keys(
  attributeTypeLabels,
) as ProjectAttributeType[];

const MarkdownPreview = lazy(() =>
  import("./projects-markdown-preview.js").then((module) => ({
    default: module.ProjectsMarkdownPreview,
  })),
);

function emptyProjectDraft(): ProjectDraft {
  return { title: "", summary: "", techStack: "", dateText: "" };
}

function projectToDraft(project: Project): ProjectDraft {
  return {
    title: project.title,
    summary: project.summary,
    techStack: project.techStack.join(", "),
    dateText: project.dateText,
  };
}

function emptyResourceDraft(): ResourceDraft {
  return { title: "", url: "", type: "link", note: "" };
}

function resourceToDraft(resource: ProjectResource): ResourceDraft {
  return {
    title: resource.title,
    url: resource.url,
    type: resource.type,
    note: resource.note,
  };
}

function emptyAttributeDraft(): AttributeDraft {
  return {
    label: "",
    aliases: "",
    type: "concept",
    dateValue: "",
    description: "",
    resourceIds: [],
  };
}

function attributeToDraft(attribute: ProjectAttribute): AttributeDraft {
  return {
    label: attribute.label,
    aliases: attribute.aliases.join(", "),
    type: attribute.type,
    dateValue: attribute.dateValue,
    description: attribute.description,
    resourceIds: attribute.resourceIds,
  };
}

function commaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not synced";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function mutationError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function ProjectsApp({
  initialProjects,
  initialSummary,
}: {
  initialProjects?: Project[];
  initialSummary?: ProjectsSummary;
}) {
  const { rpcClient, openExternal } = useCareerightUi();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeNoteId, setActiveNoteId] = useState("");
  const [projectDialog, setProjectDialog] = useState<ProjectDialogState | null>(
    null,
  );
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(
    emptyProjectDraft,
  );
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({
    title: "",
    content: "",
  });
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [newNoteDraft, setNewNoteDraft] = useState<NoteDraft>({
    title: "",
    content: "",
  });
  const [resourceDialog, setResourceDialog] =
    useState<ResourceDialogState | null>(null);
  const [resourceDraft, setResourceDraft] =
    useState<ResourceDraft>(emptyResourceDraft);
  const [attributeDialog, setAttributeDialog] =
    useState<AttributeDialogState | null>(null);
  const [attributeDraft, setAttributeDraft] =
    useState<AttributeDraft>(emptyAttributeDraft);
  const [selectedAttribute, setSelectedAttribute] =
    useState<ProjectAttribute | null>(null);
  const [projectError, setProjectError] = useState("");

  const summaryQuery = useQuery({
    queryKey: projectsSummaryQueryKey,
    queryFn: () => rpcClient.projects.summary(),
    initialData: initialSummary,
  });
  const projectsQuery = useQuery({
    queryKey: projectsListQueryKey,
    queryFn: () => rpcClient.projects.list(),
    initialData: initialProjects,
  });
  const projects = projectsQuery.data ?? [];
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ??
    projects[0] ??
    null;
  const effectiveProjectId = selectedProject?.id ?? "";
  const detailQuery = useQuery({
    queryKey: projectDetailQueryKey(effectiveProjectId),
    queryFn: () => rpcClient.projects.get({ projectId: effectiveProjectId }),
    enabled: Boolean(effectiveProjectId),
  });
  const detail = detailQuery.data;
  const notes = detail?.notes ?? [];
  const activeNote =
    notes.find((note) => note.id === activeNoteId) ?? notes[0] ?? null;
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) =>
      [
        project.title,
        project.summary,
        project.dateText,
        project.techStack.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [projects, searchQuery]);

  useEffect(() => {
    if (!selectedProjectId && projects[0]) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!activeNoteId && notes[0]) {
      setActiveNoteId(notes[0].id);
    }
  }, [activeNoteId, notes]);

  useEffect(() => {
    if (activeNote) {
      setNoteDraft({
        title: activeNote.title,
        content: activeNote.content,
      });
    } else {
      setNoteDraft({ title: "", content: "" });
      setIsEditingNote(false);
    }
  }, [activeNote]);

  function invalidateProjects(projectId = effectiveProjectId) {
    void queryClient.invalidateQueries({ queryKey: projectsSummaryQueryKey });
    void queryClient.invalidateQueries({ queryKey: projectsListQueryKey });
    if (projectId) {
      void queryClient.invalidateQueries({
        queryKey: projectDetailQueryKey(projectId),
      });
    }
  }

  const createProjectMutation = useMutation({
    mutationFn: (draft: ProjectDraft) =>
      rpcClient.projects.create({
        title: draft.title,
        summary: draft.summary,
        techStack: commaList(draft.techStack),
        dateText: draft.dateText,
      }),
    onSuccess: (project) => {
      setProjectDialog(null);
      setProjectError("");
      setSelectedProjectId(project.id);
      invalidateProjects(project.id);
    },
    onError: (error) => setProjectError(mutationError(error)),
  });
  const updateProjectMutation = useMutation({
    mutationFn: (draft: ProjectDraft) =>
      rpcClient.projects.update({
        projectId: effectiveProjectId,
        patch: {
          title: draft.title,
          summary: draft.summary,
          techStack: commaList(draft.techStack),
          dateText: draft.dateText,
        },
      }),
    onSuccess: () => {
      setProjectDialog(null);
      setProjectError("");
      invalidateProjects();
    },
    onError: (error) => setProjectError(mutationError(error)),
  });
  const importMutation = useMutation({
    mutationFn: () => rpcClient.projects.importFromProfileProjects(),
    onSuccess: (result) => {
      const firstCreated = result.created[0];
      if (firstCreated) {
        setSelectedProjectId(firstCreated.id);
      }
      invalidateProjects(firstCreated?.id);
    },
  });
  const syncMutation = useMutation({
    mutationFn: () =>
      rpcClient.projects.syncFromProfileProject({ projectId: effectiveProjectId }),
    onSuccess: () => invalidateProjects(),
  });
  const archiveMutation = useMutation({
    mutationFn: () => rpcClient.projects.archive({ projectId: effectiveProjectId }),
    onSuccess: () => invalidateProjects(),
  });
  const deleteProjectMutation = useMutation({
    mutationFn: () => rpcClient.projects.delete({ projectId: effectiveProjectId }),
    onSuccess: () => {
      setSelectedProjectId("");
      invalidateProjects();
    },
  });
  const createNoteMutation = useMutation({
    mutationFn: (draft: NoteDraft) =>
      rpcClient.projects.createNote({
        projectId: effectiveProjectId,
        title: draft.title,
        content: draft.content,
      }),
    onSuccess: (note) => {
      setIsCreateNoteOpen(false);
      setNewNoteDraft({ title: "", content: "" });
      setActiveNoteId(note.id);
      setIsEditingNote(true);
      invalidateProjects();
    },
  });
  const updateNoteMutation = useMutation({
    mutationFn: (draft: NoteDraft) =>
      rpcClient.projects.updateNote({
        noteId: activeNote?.id ?? "",
        patch: draft,
      }),
    onSuccess: () => {
      setIsEditingNote(false);
      invalidateProjects();
    },
  });
  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => rpcClient.projects.deleteNote({ noteId }),
    onSuccess: () => {
      setActiveNoteId("");
      setIsEditingNote(false);
      invalidateProjects();
    },
  });
  const createResourceMutation = useMutation({
    mutationFn: (draft: ResourceDraft) =>
      rpcClient.projects.createResource({
        projectId: effectiveProjectId,
        ...draft,
      }),
    onSuccess: () => {
      setResourceDialog(null);
      invalidateProjects();
    },
  });
  const updateResourceMutation = useMutation({
    mutationFn: (draft: ResourceDraft) =>
      rpcClient.projects.updateResource({
        projectId: effectiveProjectId,
        resourceId: resourceDialog?.resource?.id ?? "",
        patch: draft,
      }),
    onSuccess: () => {
      setResourceDialog(null);
      invalidateProjects();
    },
  });
  const deleteResourceMutation = useMutation({
    mutationFn: (resourceId: string) =>
      rpcClient.projects.deleteResource({
        projectId: effectiveProjectId,
        resourceId,
      }),
    onSuccess: () => invalidateProjects(),
  });
  const createAttributeMutation = useMutation({
    mutationFn: (draft: AttributeDraft) =>
      rpcClient.projects.createAttribute({
        projectId: effectiveProjectId,
        label: draft.label,
        aliases: commaList(draft.aliases),
        type: draft.type,
        dateValue: draft.dateValue,
        description: draft.description,
        resourceIds: draft.resourceIds,
      }),
    onSuccess: () => {
      setAttributeDialog(null);
      invalidateProjects();
    },
  });
  const updateAttributeMutation = useMutation({
    mutationFn: (draft: AttributeDraft) =>
      rpcClient.projects.updateAttribute({
        projectId: effectiveProjectId,
        attributeId: attributeDialog?.attribute?.id ?? "",
        patch: {
          label: draft.label,
          aliases: commaList(draft.aliases),
          type: draft.type,
          dateValue: draft.dateValue,
          description: draft.description,
          resourceIds: draft.resourceIds,
        },
      }),
    onSuccess: () => {
      setAttributeDialog(null);
      invalidateProjects();
    },
  });
  const deleteAttributeMutation = useMutation({
    mutationFn: (attributeId: string) =>
      rpcClient.projects.deleteAttribute({
        projectId: effectiveProjectId,
        attributeId,
      }),
    onSuccess: () => invalidateProjects(),
  });

  function openCreateProject() {
    setProjectError("");
    setProjectDraft(emptyProjectDraft());
    setProjectDialog({ mode: "create" });
  }

  function openEditProject(project: Project) {
    setProjectError("");
    setProjectDraft(projectToDraft(project));
    setProjectDialog({ mode: "edit", project });
  }

  function openCreateResource() {
    setResourceDraft(emptyResourceDraft());
    setResourceDialog({ mode: "create" });
  }

  function openEditResource(resource: ProjectResource) {
    setResourceDraft(resourceToDraft(resource));
    setResourceDialog({ mode: "edit", resource });
  }

  function openCreateAttribute() {
    setAttributeDraft(emptyAttributeDraft());
    setAttributeDialog({ mode: "create" });
  }

  function openEditAttribute(attribute: ProjectAttribute) {
    setAttributeDraft(attributeToDraft(attribute));
    setAttributeDialog({ mode: "edit", attribute });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <header className="flex flex-col gap-3 rounded-lg border border-border bg-background px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <SidebarTrigger className="mt-0.5" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-semibold tracking-normal sm:text-2xl">
                Projects
              </h1>
              <Badge variant="secondary">
                {summaryQuery.data?.totalProjects ?? 0} workspaces
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Turn resume projects into living notes, diagrams, resources, and
              clickable technical references.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            Import from resume
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={openCreateProject}>
            <Plus data-icon="inline-start" />
            New project
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="gap-2 px-3 sm:px-6">
          <CardTitle>Project workspace</CardTitle>
          <CardDescription>
            Pick a project on the left, then keep its story, stack, sync state,
            resources, and references in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-4 px-3 sm:px-6 xl:grid-cols-[22rem_minmax(0,1fr)] xl:gap-5">
          <div className="grid min-w-0 gap-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">Project library</p>
                <p className="text-sm text-muted-foreground">
                  {summaryQuery.data?.unlinkedProfileProjects ?? 0} resume
                  projects ready to import.
                </p>
              </div>
              <Badge variant="outline">{projects.length}</Badge>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search projects or stack"
                className="pl-9"
              />
            </div>
            {projectsQuery.isPending ? (
              <div className="grid gap-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <Empty className="border border-dashed bg-muted/20 p-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderKanban aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No projects yet</EmptyTitle>
                  <EmptyDescription>
                    Import resume projects or create a workspace manually.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid max-h-72 gap-2 overflow-auto pr-1 sm:max-h-80">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={cn(
                      "grid min-w-0 gap-2 rounded-lg border border-border bg-card p-3 text-left text-card-foreground transition-colors hover:bg-muted/50",
                      selectedProject?.id === project.id &&
                        "border-primary bg-primary/5",
                    )}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setActiveNoteId("");
                      setIsEditingNote(false);
                    }}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{project.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {project.summary || "No summary yet"}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {projectStatusLabels[project.status]}
                      </Badge>
                    </div>
                    {project.techStack.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {project.techStack.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProject ? (
            <ProjectInfoPanel
              archivePending={archiveMutation.isPending}
              deletePending={deleteProjectMutation.isPending}
              project={detail?.project ?? selectedProject}
              syncPending={syncMutation.isPending}
              onArchive={() => {
                if (window.confirm("Archive this project?")) {
                  archiveMutation.mutate();
                }
              }}
              onDelete={() => {
                if (window.confirm("Delete this project workspace?")) {
                  deleteProjectMutation.mutate();
                }
              }}
              onEdit={() => openEditProject(detail?.project ?? selectedProject)}
              onSync={() => syncMutation.mutate()}
            />
          ) : (
            <Empty className="min-h-80 border border-dashed bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Select or create a project</EmptyTitle>
                <EmptyDescription>
                  A project workspace keeps your project story, architecture,
                  resources, and interview references together.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <div className="min-w-0">
        {!selectedProject ? null : detailQuery.isPending && !detail ? (
          <ProjectSkeleton />
        ) : detail ? (
          <ProjectWorkspace
            activeNote={activeNote}
            activeNoteId={activeNoteId}
            createAttributePending={createAttributeMutation.isPending}
            createNotePending={createNoteMutation.isPending}
            createResourcePending={createResourceMutation.isPending}
            deleteAttributePending={deleteAttributeMutation.isPending}
            deleteNotePending={deleteNoteMutation.isPending}
            deleteResourcePending={deleteResourceMutation.isPending}
            detail={detail}
            isEditingNote={isEditingNote}
            noteDraft={noteDraft}
            onCancelNoteEdit={() => {
              if (activeNote) {
                setNoteDraft({
                  title: activeNote.title,
                  content: activeNote.content,
                });
              }
              setIsEditingNote(false);
            }}
            onCreateAttribute={openCreateAttribute}
            onCreateNote={() => setIsCreateNoteOpen(true)}
            onCreateResource={openCreateResource}
            onDeleteAttribute={(attributeId) => {
              if (window.confirm("Delete this reference?")) {
                deleteAttributeMutation.mutate(attributeId);
              }
            }}
            onDeleteNote={(noteId) => {
              if (window.confirm("Delete this note?")) {
                deleteNoteMutation.mutate(noteId);
              }
            }}
            onDeleteResource={(resourceId) => {
              if (window.confirm("Delete this resource?")) {
                deleteResourceMutation.mutate(resourceId);
              }
            }}
            onEditAttribute={openEditAttribute}
            onEditNote={() => setIsEditingNote(true)}
            onEditResource={openEditResource}
            onOpenAttribute={setSelectedAttribute}
            onOpenExternal={openExternal}
            onSaveNote={() => updateNoteMutation.mutate(noteDraft)}
            onSelectNote={(noteId) => {
              setActiveNoteId(noteId);
              setIsEditingNote(false);
            }}
            onUpdateNoteDraft={setNoteDraft}
            saveNotePending={updateNoteMutation.isPending}
          />
        ) : (
          <Empty className="min-h-[32rem] border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderKanban aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Could not load project</EmptyTitle>
              <EmptyDescription>
                Refresh the workspace and try opening this project again.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <ProjectDialog
        draft={projectDraft}
        error={projectError}
        isOpen={Boolean(projectDialog)}
        isPending={createProjectMutation.isPending || updateProjectMutation.isPending}
        mode={projectDialog?.mode ?? "create"}
        onDraftChange={setProjectDraft}
        onOpenChange={(open) => !open && setProjectDialog(null)}
        onSubmit={() => {
          if (projectDialog?.mode === "edit") {
            updateProjectMutation.mutate(projectDraft);
          } else {
            createProjectMutation.mutate(projectDraft);
          }
        }}
      />
      <NoteDialog
        draft={newNoteDraft}
        isOpen={isCreateNoteOpen}
        isPending={createNoteMutation.isPending}
        onDraftChange={setNewNoteDraft}
        onOpenChange={setIsCreateNoteOpen}
        onSubmit={() => createNoteMutation.mutate(newNoteDraft)}
      />
      <ResourceDialog
        draft={resourceDraft}
        isOpen={Boolean(resourceDialog)}
        isPending={
          createResourceMutation.isPending || updateResourceMutation.isPending
        }
        mode={resourceDialog?.mode ?? "create"}
        onDraftChange={setResourceDraft}
        onOpenChange={(open) => !open && setResourceDialog(null)}
        onSubmit={() => {
          if (resourceDialog?.mode === "edit") {
            updateResourceMutation.mutate(resourceDraft);
          } else {
            createResourceMutation.mutate(resourceDraft);
          }
        }}
      />
      <AttributeDialog
        draft={attributeDraft}
        isOpen={Boolean(attributeDialog)}
        isPending={
          createAttributeMutation.isPending || updateAttributeMutation.isPending
        }
        mode={attributeDialog?.mode ?? "create"}
        project={detail?.project ?? null}
        onDraftChange={setAttributeDraft}
        onOpenChange={(open) => !open && setAttributeDialog(null)}
        onSubmit={() => {
          if (attributeDialog?.mode === "edit") {
            updateAttributeMutation.mutate(attributeDraft);
          } else {
            createAttributeMutation.mutate(attributeDraft);
          }
        }}
      />
      <ReferenceSheet
        attribute={selectedAttribute}
        project={detail?.project ?? null}
        onOpenChange={(open) => !open && setSelectedAttribute(null)}
        onOpenExternal={openExternal}
      />
    </div>
  );
}

function MarkdownPreviewFallback() {
  return (
    <Skeleton className="min-h-[24rem] rounded-lg sm:min-h-[32rem] xl:min-h-[42rem]" />
  );
}

function ProjectInfoPanel({
  archivePending,
  deletePending,
  project,
  syncPending,
  onArchive,
  onDelete,
  onEdit,
  onSync,
}: {
  archivePending: boolean;
  deletePending: boolean;
  project: Project;
  syncPending: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSync: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-4 rounded-lg border border-border bg-muted/20 p-3 sm:gap-5 sm:p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words font-heading text-xl font-semibold tracking-normal sm:text-2xl">
              {project.title}
            </h2>
            <Badge variant={project.status === "archived" ? "outline" : "secondary"}>
              {projectStatusLabels[project.status]}
            </Badge>
            {project.sourceProfileItemId ? (
              <Badge variant="outline">Resume linked</Badge>
            ) : null}
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            {project.summary ||
              "Add a project summary to make this workspace useful during interviews."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {project.sourceProfileItemId ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={syncPending}
              onClick={onSync}
            >
              {syncPending ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              Sync
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onEdit}>
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={archivePending}
            onClick={onArchive}
          >
            <Archive data-icon="inline-start" />
            Archive
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={deletePending}
            onClick={onDelete}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MiniStat icon={Tags} label="Tech stack" value={project.techStack.length} />
        <MiniStat icon={LinkIcon} label="Resources" value={project.resources.length} />
        <MiniStat icon={Boxes} label="References" value={project.attributes.length} />
      </div>

      <div className="flex flex-wrap gap-2">
        {project.techStack.length > 0 ? (
          project.techStack.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Add technologies so references like Kafka can become clickable in notes.
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {project.dateText ? (
          <span className="inline-flex min-w-0 items-center gap-1 break-words">
            <CalendarDays aria-hidden="true" />
            {project.dateText}
          </span>
        ) : null}
        {project.sourceProfileUpdatedAt ? (
          <span>Resume sync: {formatDateTime(project.sourceProfileUpdatedAt)}</span>
        ) : null}
      </div>
    </div>
  );
}

function ProjectWorkspace({
  activeNote,
  activeNoteId,
  createAttributePending,
  createNotePending,
  createResourcePending,
  deleteAttributePending,
  deleteNotePending,
  deleteResourcePending,
  detail,
  isEditingNote,
  noteDraft,
  onCancelNoteEdit,
  onCreateAttribute,
  onCreateNote,
  onCreateResource,
  onDeleteAttribute,
  onDeleteNote,
  onDeleteResource,
  onEditAttribute,
  onEditNote,
  onEditResource,
  onOpenAttribute,
  onOpenExternal,
  onSaveNote,
  onSelectNote,
  onUpdateNoteDraft,
  saveNotePending,
}: {
  activeNote: ProjectDetail["notes"][number] | null;
  activeNoteId: string;
  createAttributePending: boolean;
  createNotePending: boolean;
  createResourcePending: boolean;
  deleteAttributePending: boolean;
  deleteNotePending: boolean;
  deleteResourcePending: boolean;
  detail: ProjectDetail;
  isEditingNote: boolean;
  noteDraft: NoteDraft;
  onCancelNoteEdit: () => void;
  onCreateAttribute: () => void;
  onCreateNote: () => void;
  onCreateResource: () => void;
  onDeleteAttribute: (attributeId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onDeleteResource: (resourceId: string) => void;
  onEditAttribute: (attribute: ProjectAttribute) => void;
  onEditNote: () => void;
  onEditResource: (resource: ProjectResource) => void;
  onOpenAttribute: (attribute: ProjectAttribute) => void;
  onOpenExternal: (url: string) => void | Promise<void>;
  onSaveNote: () => void;
  onSelectNote: (noteId: string) => void;
  onUpdateNoteDraft: (draft: NoteDraft) => void;
  saveNotePending: boolean;
}) {
  const { project, notes } = detail;

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <Tabs defaultValue="notes">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-flex sm:w-fit">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="notes">
          <Card>
            <CardHeader className="gap-3 px-3 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <CardTitle>Notebook</CardTitle>
                <CardDescription>
                  Write markdown and preview the rendered project page with Mermaid diagrams.
                </CardDescription>
              </div>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={onCreateNote}
                disabled={createNotePending}
              >
                <Plus data-icon="inline-start" />
                New note
              </Button>
            </CardHeader>
            <CardContent className="min-w-0 px-3 sm:px-6">
              {notes.length === 0 ? (
                <Empty className="border border-dashed bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No notes yet</EmptyTitle>
                    <EmptyDescription>
                      Create the first markdown page for architecture, learnings, or interview stories.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid min-w-0 gap-4">
                  <div className="flex max-w-full gap-2 overflow-x-auto rounded-lg border border-border bg-muted/20 p-2">
                    {notes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        className={cn(
                          "min-w-[11rem] max-w-[75vw] rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-background sm:min-w-56 sm:max-w-72",
                          note.id === activeNoteId && "bg-background shadow-sm",
                        )}
                        onClick={() => onSelectNote(note.id)}
                      >
                        <span className="block truncate font-medium">{note.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDateTime(note.updatedAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {activeNote ? (
                    <div className="grid min-w-0 gap-4">
                      {isEditingNote ? (
                        <>
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                            <Input
                              value={noteDraft.title}
                              onChange={(event) =>
                                onUpdateNoteDraft({
                                  ...noteDraft,
                                  title: event.target.value,
                                })
                              }
                              placeholder="Note title"
                            />
                            <Button
                              type="button"
                              className="w-full sm:w-auto"
                              disabled={saveNotePending || !noteDraft.title.trim()}
                              onClick={onSaveNote}
                            >
                              {saveNotePending ? (
                                <Loader2
                                  className="animate-spin"
                                  data-icon="inline-start"
                                />
                              ) : (
                                <Save data-icon="inline-start" />
                              )}
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={onCancelNoteEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto"
                              disabled={deleteNotePending}
                              onClick={() => onDeleteNote(activeNote.id)}
                            >
                              <Trash2 data-icon="inline-start" />
                              Delete
                            </Button>
                          </div>
                          <div className="grid min-h-[24rem] gap-4 sm:min-h-[32rem] xl:min-h-[42rem] xl:grid-cols-2">
                            <Textarea
                              value={noteDraft.content}
                              onChange={(event) =>
                                onUpdateNoteDraft({
                                  ...noteDraft,
                                  content: event.target.value,
                                })
                              }
                              className="min-h-[24rem] resize-y font-mono text-sm leading-6 sm:min-h-[32rem] xl:min-h-[42rem]"
                              placeholder={
                                "# Architecture\n\n```mermaid\ngraph TD\n  API --> MongoDB\n```\n\nKafka powers the event pipeline."
                              }
                            />
                            <Suspense fallback={<MarkdownPreviewFallback />}>
                              <MarkdownPreview
                                attributes={project.attributes}
                                content={noteDraft.content}
                                onOpenAttribute={onOpenAttribute}
                              />
                            </Suspense>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4">
                            <div className="min-w-0">
                              <h3 className="break-words font-heading text-xl font-semibold tracking-normal sm:text-2xl">
                                {noteDraft.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Last edited {formatDateTime(activeNote.updatedAt)}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                              <Button type="button" className="w-full sm:w-auto" onClick={onEditNote}>
                                <PencilLine data-icon="inline-start" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto"
                                disabled={deleteNotePending}
                                onClick={() => onDeleteNote(activeNote.id)}
                              >
                                <Trash2 data-icon="inline-start" />
                                Delete
                              </Button>
                            </div>
                          </div>
                          <Suspense fallback={<MarkdownPreviewFallback />}>
                            <MarkdownPreview
                              attributes={project.attributes}
                              content={noteDraft.content}
                              onOpenAttribute={onOpenAttribute}
                            />
                          </Suspense>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="resources">
          <ResourcesPanel
            deletePending={deleteResourcePending}
            project={project}
            onCreate={onCreateResource}
            onDelete={onDeleteResource}
            onEdit={onEditResource}
            onOpenExternal={onOpenExternal}
            createPending={createResourcePending}
          />
        </TabsContent>
        <TabsContent value="references">
          <AttributesPanel
            deletePending={deleteAttributePending}
            project={project}
            onCreate={onCreateAttribute}
            onDelete={onDeleteAttribute}
            onEdit={onEditAttribute}
            onOpenAttribute={onOpenAttribute}
            createPending={createAttributePending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Tags;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ResourcesPanel({
  createPending,
  deletePending,
  project,
  onCreate,
  onDelete,
  onEdit,
  onOpenExternal,
}: {
  createPending: boolean;
  deletePending: boolean;
  project: Project;
  onCreate: () => void;
  onDelete: (resourceId: string) => void;
  onEdit: (resource: ProjectResource) => void;
  onOpenExternal: (url: string) => void | Promise<void>;
}) {
  return (
    <Card>
      <CardHeader className="gap-3 px-3 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            Keep repos, demos, docs, articles, videos, and design links close to the project.
          </CardDescription>
        </div>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={onCreate}
          disabled={createPending}
        >
          <Plus data-icon="inline-start" />
          Add resource
        </Button>
      </CardHeader>
      <CardContent className="min-w-0 px-3 sm:px-6">
        {project.resources.length === 0 ? (
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LinkIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No resources yet</EmptyTitle>
              <EmptyDescription>
                Add repositories, demos, design docs, or references that explain the project.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {project.resources.map((resource) => (
              <div
                key={resource.id}
                className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-3 sm:p-4"
              >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{resource.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {resource.url}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit shrink-0">
                    {resourceTypeLabels[resource.type]}
                  </Badge>
                </div>
                {resource.note ? (
                  <p className="break-words text-sm text-muted-foreground">
                    {resource.note}
                  </p>
                ) : null}
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => onOpenExternal(resource.url)}
                  >
                    <ExternalLink data-icon="inline-start" />
                    Open
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => onEdit(resource)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={deletePending}
                    onClick={() => onDelete(resource.id)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttributesPanel({
  createPending,
  deletePending,
  project,
  onCreate,
  onDelete,
  onEdit,
  onOpenAttribute,
}: {
  createPending: boolean;
  deletePending: boolean;
  project: Project;
  onCreate: () => void;
  onDelete: (attributeId: string) => void;
  onEdit: (attribute: ProjectAttribute) => void;
  onOpenAttribute: (attribute: ProjectAttribute) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-3 px-3 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <CardTitle>Clickable references</CardTitle>
          <CardDescription>
            Terms here become clickable inside rendered markdown preview.
          </CardDescription>
        </div>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={onCreate}
          disabled={createPending}
        >
          <Plus data-icon="inline-start" />
          Add reference
        </Button>
      </CardHeader>
      <CardContent className="min-w-0 px-3 sm:px-6">
        {project.attributes.length === 0 ? (
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Boxes aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No references yet</EmptyTitle>
              <EmptyDescription>
                Add Kafka, Redis, launch dates, or key people to make notes navigable.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {project.attributes.map((attribute) => (
              <div
                key={attribute.id}
                className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-3 sm:p-4"
              >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => onOpenAttribute(attribute)}
                  >
                    <p className="break-words font-medium text-primary underline-offset-4 hover:underline">
                      {attribute.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {attributeTypeLabels[attribute.type]}
                      {attribute.dateValue ? ` · ${attribute.dateValue}` : ""}
                    </p>
                  </button>
                  <Badge variant="outline" className="w-fit shrink-0">
                    {attribute.aliases.length} aliases
                  </Badge>
                </div>
                {attribute.description ? (
                  <p className="line-clamp-3 break-words text-sm text-muted-foreground">
                    {attribute.description}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => onEdit(attribute)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={deletePending}
                    onClick={() => onDelete(attribute.id)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectDialog({
  draft,
  error,
  isOpen,
  isPending,
  mode,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: {
  draft: ProjectDraft;
  error: string;
  isOpen: boolean;
  isPending: boolean;
  mode: "create" | "edit";
  onDraftChange: (draft: ProjectDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            Capture the story, stack, and timeline for this project workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(event) =>
                onDraftChange({ ...draft, title: event.target.value })
              }
              placeholder="Careeright Dashboard"
            />
          </Field>
          <Field label="Summary">
            <Textarea
              value={draft.summary}
              onChange={(event) =>
                onDraftChange({ ...draft, summary: event.target.value })
              }
              placeholder="What did this project solve, and what should interviewers know?"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tech stack">
              <Input
                value={draft.techStack}
                onChange={(event) =>
                  onDraftChange({ ...draft, techStack: event.target.value })
                }
                placeholder="Next.js, MongoDB, Kafka"
              />
            </Field>
            <Field label="Timeline">
              <Input
                value={draft.dateText}
                onChange={(event) =>
                  onDraftChange({ ...draft, dateText: event.target.value })
                }
                placeholder="Jan 2025 - Present"
              />
            </Field>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" disabled={isPending || !draft.title.trim()} onClick={onSubmit}>
            {isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            {mode === "edit" ? "Save project" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({
  draft,
  isOpen,
  isPending,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: {
  draft: NoteDraft;
  isOpen: boolean;
  isPending: boolean;
  onDraftChange: (draft: NoteDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
          <DialogDescription>
            Add a markdown page to this project notebook.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(event) =>
                onDraftChange({ ...draft, title: event.target.value })
              }
              placeholder="Architecture walkthrough"
            />
          </Field>
          <Field label="Starter markdown">
            <Textarea
              value={draft.content}
              onChange={(event) =>
                onDraftChange({ ...draft, content: event.target.value })
              }
              placeholder="# Architecture"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" disabled={isPending || !draft.title.trim()} onClick={onSubmit}>
            {isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            Create note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourceDialog({
  draft,
  isOpen,
  isPending,
  mode,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: {
  draft: ResourceDraft;
  isOpen: boolean;
  isPending: boolean;
  mode: "create" | "edit";
  onDraftChange: (draft: ResourceDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit resource" : "Add resource"}</DialogTitle>
          <DialogDescription>
            Save a project link with context for future reference.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(event) =>
                onDraftChange({ ...draft, title: event.target.value })
              }
              placeholder="GitHub repository"
            />
          </Field>
          <Field label="URL">
            <Input
              value={draft.url}
              onChange={(event) =>
                onDraftChange({ ...draft, url: event.target.value })
              }
              placeholder="https://github.com/..."
            />
          </Field>
          <Field label="Type">
            <div className="flex flex-wrap gap-2">
              {resourceTypeOptions.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={draft.type === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => onDraftChange({ ...draft, type })}
                >
                  {resourceTypeLabels[type]}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Note">
            <Textarea
              value={draft.note}
              onChange={(event) =>
                onDraftChange({ ...draft, note: event.target.value })
              }
              placeholder="Why this link matters"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={isPending || !draft.title.trim() || !draft.url.trim()}
            onClick={onSubmit}
          >
            {isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            {mode === "edit" ? "Save resource" : "Add resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttributeDialog({
  draft,
  isOpen,
  isPending,
  mode,
  project,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: {
  draft: AttributeDraft;
  isOpen: boolean;
  isPending: boolean;
  mode: "create" | "edit";
  project: Project | null;
  onDraftChange: (draft: AttributeDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit reference" : "Add reference"}</DialogTitle>
          <DialogDescription>
            The label and aliases will become clickable in project markdown.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label">
              <Input
                value={draft.label}
                onChange={(event) =>
                  onDraftChange({ ...draft, label: event.target.value })
                }
                placeholder="Kafka"
              />
            </Field>
            <Field label="Aliases">
              <Input
                value={draft.aliases}
                onChange={(event) =>
                  onDraftChange({ ...draft, aliases: event.target.value })
                }
                placeholder="Apache Kafka, event bus"
              />
            </Field>
          </div>
          <Field label="Type">
            <div className="flex flex-wrap gap-2">
              {attributeTypeOptions.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={draft.type === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => onDraftChange({ ...draft, type })}
                >
                  {attributeTypeLabels[type]}
                </Button>
              ))}
            </div>
          </Field>
          {draft.type === "date" ? (
            <Field label="Date details">
              <Input
                value={draft.dateValue}
                onChange={(event) =>
                  onDraftChange({ ...draft, dateValue: event.target.value })
                }
                placeholder="15 Jan 2025"
              />
            </Field>
          ) : null}
          <Field label="Description">
            <Textarea
              value={draft.description}
              onChange={(event) =>
                onDraftChange({ ...draft, description: event.target.value })
              }
              placeholder="Explain this term in the context of the project."
            />
          </Field>
          {project?.resources.length ? (
            <Field label="Related resources">
              <div className="flex flex-wrap gap-2">
                {project.resources.map((resource) => {
                  const selected = draft.resourceIds.includes(resource.id);

                  return (
                    <Button
                      key={resource.id}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          resourceIds: selected
                            ? draft.resourceIds.filter((id) => id !== resource.id)
                            : [...draft.resourceIds, resource.id],
                        })
                      }
                    >
                      {resource.title}
                    </Button>
                  );
                })}
              </div>
            </Field>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" disabled={isPending || !draft.label.trim()} onClick={onSubmit}>
            {isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            {mode === "edit" ? "Save reference" : "Add reference"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReferenceSheet({
  attribute,
  project,
  onOpenChange,
  onOpenExternal,
}: {
  attribute: ProjectAttribute | null;
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onOpenExternal: (url: string) => void | Promise<void>;
}) {
  const resources =
    project && attribute
      ? project.resources.filter((resource) =>
          attribute.resourceIds.includes(resource.id),
        )
      : [];

  return (
    <Sheet open={Boolean(attribute)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        {attribute ? (
          <>
            <SheetHeader>
              <SheetTitle>{attribute.label}</SheetTitle>
              <SheetDescription>
                {attributeTypeLabels[attribute.type]}
                {attribute.dateValue ? ` · ${attribute.dateValue}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="grid min-w-0 gap-5 overflow-auto px-4 pb-6 sm:px-6">
              {attribute.description ? (
                <p className="break-words text-sm leading-7 text-foreground/90">
                  {attribute.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description has been added for this reference yet.
                </p>
              )}
              {attribute.aliases.length > 0 ? (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Aliases</p>
                  <div className="flex flex-wrap gap-2">
                    {attribute.aliases.map((alias) => (
                      <Badge key={alias} variant="secondary">
                        {alias}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              <Separator />
              <div className="grid gap-3">
                <p className="text-sm font-medium">Related resources</p>
                {resources.length > 0 ? (
                  resources.map((resource) => (
                    <button
                      key={resource.id}
                      type="button"
                      className="min-w-0 rounded-lg border border-border p-3 text-left hover:bg-muted/50"
                      onClick={() => onOpenExternal(resource.url)}
                    >
                      <span className="block break-words font-medium">
                        {resource.title}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {resource.url}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No related resources are linked to this reference.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <Skeleton className="h-[48rem] rounded-xl" />
  );
}
