import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};
type Route =
  | "analytics"
  | "board"
  | "jobs"
  | "diary"
  | "dsa"
  | "system-design"
  | "friends"
  | "leaderboard"
  | "projects"
  | "history"
  | "proposals"
  | "mcp-tools"
  | "profile";

function routeFromHref(href: string): Route | null {
  if (href === "/dashboard") return "analytics";
  if (href.startsWith("/dashboard/kanban")) return "board";
  if (href.startsWith("/dashboard/jobs")) return "jobs";
  if (href.startsWith("/dashboard/diary")) return "diary";
  if (href.startsWith("/dashboard/dsa")) return "dsa";
  if (href.startsWith("/dashboard/system-design")) return "system-design";
  if (href.startsWith("/dashboard/friends")) return "friends";
  if (href.startsWith("/dashboard/leaderboard")) return "leaderboard";
  if (href.startsWith("/dashboard/projects")) return "projects";
  if (href.startsWith("/dashboard/history")) return "history";
  if (href.startsWith("/dashboard/proposal")) return "proposals";
  if (href.startsWith("/dashboard/mcp-tools")) return "mcp-tools";
  if (href.startsWith("/dashboard/profile")) return "profile";
  return null;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, onClick, onFocus, onMouseEnter, ...props },
  ref,
) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const route = routeFromHref(href);

    if (route) {
      event.preventDefault();
      window.dispatchEvent(
        new CustomEvent("careeright:navigate", { detail: { route } }),
      );
    }
  }

  return (
    <a
      ref={ref}
      href={href}
      onClick={handleClick}
      onFocus={(event) => {
        onFocus?.(event);
        preloadRoute(href);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        preloadRoute(href);
      }}
      {...props}
    />
  );
});

function preloadRoute(href: string) {
  const route = routeFromHref(href);

  if (!route) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("careeright:preload-route", { detail: { route } }),
  );
}

export default Link;
