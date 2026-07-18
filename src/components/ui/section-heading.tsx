import * as React from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  children?: React.ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  children,
}: SectionHeadingProps) {
  const alignmentClass =
    align === "center" ? "mx-auto text-center" : "text-right";

  return (
    <div className={`space-y-3 ${alignmentClass}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold text-stone-900 dark:text-stone-100">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto max-w-2xl text-base leading-8 text-stone-600 dark:text-stone-400">
          {description}
        </p>
      ) : null}
      {children ? <div className="pt-2">{children}</div> : null}
    </div>
  );
}
