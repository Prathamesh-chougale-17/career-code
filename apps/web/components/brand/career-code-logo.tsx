import Image from "next/image";

import { cn } from "@/lib/utils";

type CareerCodeLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function CareerCodeLogo({
  alt = "",
  className,
  imageClassName,
  priority = false,
  sizes = "40px",
}: CareerCodeLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 overflow-hidden rounded-xl bg-[#070806] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
        className,
      )}
    >
      <Image
        src="/career-code-logo.png"
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imageClassName)}
      />
    </span>
  );
}
