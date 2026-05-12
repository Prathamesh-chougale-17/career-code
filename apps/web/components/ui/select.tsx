"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const selectAcronyms = new Set([
  "AI",
  "API",
  "CLI",
  "CSS",
  "HLD",
  "HTML",
  "JS",
  "LLD",
  "LLM",
  "MCP",
  "PDF",
  "TS",
  "UI",
  "URL",
  "UX",
])

type SelectLabelMap = ReadonlyMap<string, React.ReactNode>

const SelectLabelsContext = React.createContext<SelectLabelMap | null>(null)

type SelectItemLabelProps = {
  children?: React.ReactNode
  label?: string
  value?: unknown
}

function formatSelectWord(word: string) {
  const upperWord = word.toUpperCase()

  if (selectAcronyms.has(upperWord)) {
    return upperWord
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function formatSelectValue(
  value: unknown,
  placeholder?: React.ReactNode,
): React.ReactNode {
  if (value == null || value === "") {
    return placeholder ?? null
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatSelectValue(item))
      .filter(Boolean)
      .join(", ")
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()

    if (!normalized) {
      return placeholder ?? null
    }

    return normalized.split(" ").map(formatSelectWord).join(" ")
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (typeof value === "object" && "label" in value) {
    return (value as { label?: React.ReactNode }).label ?? String(value)
  }

  return String(value)
}

function formatSelectLabel(label: React.ReactNode) {
  return typeof label === "string" ? formatSelectValue(label) : label
}

function collectLabelsFromItems(
  items: SelectPrimitive.Root.Props<unknown>["items"],
  labels: Map<string, React.ReactNode>
) {
  if (!items) {
    return
  }

  if (!Array.isArray(items)) {
    for (const [value, label] of Object.entries(items)) {
      labels.set(value, formatSelectLabel(label))
    }

    return
  }

  for (const item of items) {
    if ("items" in item) {
      collectLabelsFromItems(item.items, labels)
      continue
    }

    labels.set(String(item.value), formatSelectLabel(item.label))
  }
}

function collectLabelsFromChildren(
  children: React.ReactNode,
  labels: Map<string, React.ReactNode>
) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return
    }

    const props = child.props as SelectItemLabelProps

    if (child.type === SelectItem && props.value != null) {
      const label =
        props.label != null
          ? formatSelectLabel(props.label)
          : formatSelectLabel(props.children) ?? formatSelectValue(props.value)

      labels.set(String(props.value), label)
    }

    collectLabelsFromChildren(props.children, labels)
  })
}

function Select<Value, Multiple extends boolean | undefined = false>({
  children,
  items,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  const labels = React.useMemo(() => {
    const nextLabels = new Map<string, React.ReactNode>()

    collectLabelsFromItems(
      items as SelectPrimitive.Root.Props<unknown>["items"],
      nextLabels
    )
    collectLabelsFromChildren(children, nextLabels)

    return nextLabels
  }, [children, items])
  const rootItems = items ?? Object.fromEntries(labels)

  return (
    <SelectLabelsContext.Provider value={labels}>
      <SelectPrimitive.Root
        items={rootItems as SelectPrimitive.Root.Props<Value, Multiple>["items"]}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectLabelsContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  className,
  children,
  placeholder,
  ...props
}: SelectPrimitive.Value.Props) {
  const labels = React.useContext(SelectLabelsContext)

  function formatCurrentValue(value: unknown): React.ReactNode {
    if (Array.isArray(value)) {
      return value.map((item, index) => (
        <React.Fragment key={`${String(item)}-${index}`}>
          {index > 0 ? ", " : null}
          {formatCurrentValue(item)}
        </React.Fragment>
      ))
    }

    return labels?.get(String(value)) ?? formatSelectValue(value, placeholder)
  }

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      placeholder={placeholder}
      {...props}
    >
      {children ?? formatCurrentValue}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-4xl border border-input bg-input/30 px-3 py-2 text-sm font-semibold text-foreground whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn("isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl text-popover-foreground shadow-2xl ring-1 ring-foreground/5 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!", className )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-3 py-2.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  label,
  ...props
}: SelectPrimitive.Item.Props) {
  const formattedChildren =
    typeof children === "string" ? formatSelectValue(children) : children
  const itemLabel =
    label ??
    (typeof formattedChildren === "string" ? formattedChildren : undefined)

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      label={itemLabel}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2.5 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {formattedChildren}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px bg-border/50",
        className
      )}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
