import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  /** pass empty string to render without a link */
  href?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
  light?: boolean;
  /** use generated photo mark instead of svg */
  photo?: boolean;
};

const sizes = {
  sm: { box: 28, text: "text-lg" },
  md: { box: 36, text: "text-xl" },
  lg: { box: 48, text: "text-2xl" },
  xl: { box: 72, text: "text-4xl sm:text-5xl" },
  hero: { box: 88, text: "text-5xl sm:text-7xl md:text-8xl" },
};

export function BrandLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  className,
  wordmarkClassName,
  light = false,
  photo = false,
}: Props) {
  const s = sizes[size];
  const src = photo ? "/sfira-logo.jpg" : "/sfira-mark.svg";
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src={src}
        alt="Sfira"
        width={s.box}
        height={s.box}
        className={cn(
          "shrink-0",
          photo
            ? "rounded-2xl bg-white object-contain shadow-lg shadow-black/30 ring-1 ring-black/5"
            : "rounded-[22%] object-cover"
        )}
        priority={size === "hero" || size === "xl" || size === "lg"}
      />
      {showWordmark && (
        <span
          className={cn(
            "font-display font-extrabold tracking-tight",
            s.text,
            light ? "text-white" : "text-[var(--foreground)]",
            wordmarkClassName
          )}
        >
          Sfira
        </span>
      )}
    </span>
  );

  if (href === "") return content;
  return (
    <Link href={href || "/"} className="inline-flex items-center">
      {content}
    </Link>
  );
}
