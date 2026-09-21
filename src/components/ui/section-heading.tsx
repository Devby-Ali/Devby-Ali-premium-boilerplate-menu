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
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto max-w-2xl text-base leading-8 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? <div className="pt-2">{children}</div> : null}
    </div>
  );
}
