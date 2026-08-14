"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Campo de senha com alternância de visibilidade. */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof Input>
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((previous) => !previous)}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
