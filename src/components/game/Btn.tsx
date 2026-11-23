import type * as React from "react";
import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-glow",
  accent: "bg-accent text-accent-foreground hover:brightness-110",
  highlight: "bg-highlight text-highlight-foreground hover:brightness-105",
  ghost: "bg-secondary text-secondary-foreground hover:bg-muted border border-border",
  danger: "bg-destructive/15 text-destructive border border-destructive/40 hover:bg-destructive/25",
  success: "bg-success text-primary-foreground hover:brightness-110",
};
const SIZES = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-14 px-6 text-base" };

export function Btn({
  variant = "ghost",
  size = "md",
  confirm,
  className = "",
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES; confirm?: string }) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) return;
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-bold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}

export function Panel({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export const inputCls = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring";