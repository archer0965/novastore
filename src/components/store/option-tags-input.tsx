"use client";

import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Chip input for product color / size option lists. */
export function OptionTagsInput({
  id,
  label,
  hint,
  placeholder,
  values,
  onChange,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  values: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^,+|,+$/g, "");
    if (!tag) return;
    if (values.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    if (values.length >= 20) return;
    onChange([...values, tag.slice(0, 30)]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="rounded-xl border border-border bg-background px-2.5 py-2">
        {values.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {values.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`移除 ${tag}`}
                  className="rounded p-0.5 hover:bg-primary/15"
                  onClick={() =>
                    onChange(values.filter((_, i) => i !== index))
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <Input
          id={id}
          className="h-10 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
          placeholder={placeholder}
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
