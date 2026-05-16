import Image from "next/image";

import { cn } from "@repo/ui/lib/utils";

type CareerightLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function CareerightLogo({
  alt = "",
  className,
  imageClassName,
  priority = false,
  sizes = "40px",
}: CareerightLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 overflow-hidden rounded-xl bg-[#070806] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
        className,
      )}
    >
      <Image
        src="/careeright-logo.png"
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imageClassName)}
      />
    </span>
  );
}
