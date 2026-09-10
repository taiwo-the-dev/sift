import { ListChecks } from "lucide-react";

import { SelectField } from "@/components/ui/select-field";
import type {
  TaskInputField,
  TaskInputValues,
} from "@/features/activation/task-input";
import { cn } from "@/lib/utils";

const controlClassName =
  "h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/65 hover:border-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/15";

export function TaskInputFields({
  fields,
  onChange,
  values,
}: Readonly<{
  fields: readonly TaskInputField[];
  onChange: (name: string, value: string) => void;
  values: TaskInputValues;
}>) {
  if (fields.length === 0) {
    return (
      <div className="flex items-start gap-3 border-l-2 border-brand/50 py-1 pl-4">
        <ListChecks className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">No details required</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            This tool did not declare any input fields. You can run it as published.
          </p>
        </div>
      </div>
    );
  }

  return (
    <fieldset className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      <legend className="sr-only">Tool details</legend>
      {fields.map((field, index) => {
        const inputId = `task-input-${index}`;
        const labelId = `${inputId}-label`;
        const descriptionId = field.description ? `${inputId}-description` : undefined;
        const isWide =
          field.kind === "array" ||
          field.kind === "object" ||
          (field.description?.length ?? 0) > 120;
        const usesSelect = field.kind === "select" || field.kind === "boolean";
        const label = (
          <span className="flex flex-wrap items-center gap-2">
            <span>{field.label}</span>
            <span className="text-[0.65rem] font-medium text-muted-foreground">
              {field.required ? "Required" : "Optional"}
            </span>
          </span>
        );

        return (
          <div
            className={cn(
              "flex min-w-0 flex-col",
              isWide && "sm:col-span-2",
            )}
            key={field.name}
          >
            <label
              className="block text-xs font-semibold text-foreground"
              htmlFor={usesSelect ? undefined : inputId}
              id={labelId}
            >
              {label}
            </label>
            {field.description ? (
              <p
                className="mt-1 min-h-5 text-xs leading-5 text-muted-foreground"
                id={descriptionId}
              >
                {field.description}
              </p>
            ) : null}

            <div className="mt-auto pt-2">
              {usesSelect ? (
                <SelectField
                  aria-describedby={descriptionId}
                  aria-labelledby={labelId}
                  onValueChange={(value) => onChange(field.name, value)}
                  options={
                    field.kind === "boolean"
                      ? [
                          ...(!field.required
                            ? [{ label: "Not specified", value: "" }]
                            : [{ label: "Choose an option", value: "" }]),
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ]
                      : [
                          ...(!field.required
                            ? [{ label: "Not specified", value: "" }]
                            : field.defaultValue
                              ? []
                              : [{ label: "Choose an option", value: "" }]),
                          ...field.options.map((option) => ({
                            label: option,
                            value: option,
                          })),
                        ]
                  }
                  triggerClassName="h-11"
                  value={values[field.name] ?? ""}
                />
              ) : field.kind === "array" || field.kind === "object" ? (
                <textarea
                  aria-describedby={descriptionId}
                  className={cn(controlClassName, "h-auto min-h-28 resize-y py-3 font-mono text-xs")}
                  id={inputId}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  required={field.required}
                  rows={4}
                  spellCheck={false}
                  value={values[field.name] ?? ""}
                />
              ) : (
                <input
                  aria-describedby={descriptionId}
                  className={controlClassName}
                  id={inputId}
                  inputMode={
                    field.kind === "integer"
                      ? "numeric"
                      : field.kind === "number"
                        ? "decimal"
                        : undefined
                  }
                  max={field.maximum ?? undefined}
                  maxLength={field.maxLength ?? undefined}
                  min={field.minimum ?? undefined}
                  minLength={field.minLength ?? undefined}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  required={field.required}
                  step={field.kind === "integer" ? 1 : field.kind === "number" ? "any" : undefined}
                  type={
                    field.kind === "integer" || field.kind === "number"
                      ? "number"
                      : "text"
                  }
                  value={values[field.name] ?? ""}
                />
              )}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
