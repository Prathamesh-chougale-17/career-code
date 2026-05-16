import { cn } from "@repo/ui/lib/utils";

type CareerightLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
};

export function CareerightLogo({
  alt = "",
  className,
  imageClassName,
}: CareerightLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 overflow-hidden rounded-xl bg-[#070806] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
        className,
      )}
    >
      <img
        src="/careeright-logo.png"
        alt={alt}
        className={cn("size-full object-cover", imageClassName)}
      />
    </span>
  );
}
