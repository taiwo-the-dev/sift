"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SelectFieldOption<Value extends string | number> = Readonly<{
  label: string;
  value: Value;
}>;

interface SelectFieldProps<Value extends string | number> {
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
  icon?: LucideIcon;
  label?: string;
  onValueChange: (value: Value) => void;
  options: readonly SelectFieldOption<Value>[];
  triggerClassName?: string;
  value: Value;
}

export function SelectField<Value extends string | number>({
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  icon: Icon,
  label,
  onValueChange,
  options,
  triggerClassName,
  value,
}: SelectFieldProps<Value>) {
  return (
    <Select.Root<Value>
      items={options}
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue !== null && nextValue !== value) {
          onValueChange(nextValue);
        }
      }}
    >
      <div className="grid min-w-0 gap-1.5">
        {label ? (
          <Select.Label className="text-xs font-medium text-muted-foreground">
            {label}
          </Select.Label>
        ) : null}

        <Select.Trigger
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          className={cn(
            "group flex h-11 min-w-0 w-full max-w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg border border-input bg-background px-3.5 text-left text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] hover:border-muted-foreground/70 hover:bg-card focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 data-popup-open:border-ring data-popup-open:bg-card data-popup-open:ring-3 data-popup-open:ring-ring/15",
            triggerClassName,
          )}
        >
          {Icon ? (
            <Icon
              className="size-4 shrink-0 text-muted-foreground transition-colors group-data-[popup-open]:text-brand"
              aria-hidden="true"
            />
          ) : null}
          <Select.Value className="min-w-0 flex-1 truncate" />
          <Select.Icon className="grid size-5 shrink-0 place-items-center text-muted-foreground">
            <ChevronDown
              className="size-4 transition-transform duration-150 group-data-[popup-open]:rotate-180"
              aria-hidden="true"
            />
          </Select.Icon>
        </Select.Trigger>
      </div>

      <Select.Portal>
        <Select.Positioner
          align="start"
          alignItemWithTrigger={false}
          side="bottom"
          sideOffset={6}
          className="z-50 w-[var(--anchor-width)] outline-none"
        >
          <Select.Popup className="w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-lg border border-input bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/45 outline-none transition-[opacity,transform] duration-150 data-ending-style:-translate-y-1 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Select.List className="max-h-72 overflow-y-auto outline-none">
              {options.map((option) => (
                <Select.Item
                  key={String(option.value)}
                  value={option.value}
                  className="grid min-h-11 w-full cursor-pointer grid-cols-[minmax(0,1fr)_1.25rem] items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-colors data-highlighted:bg-muted data-highlighted:text-foreground data-selected:bg-brand/8 data-selected:text-foreground"
                >
                  <Select.ItemText className="min-w-0 truncate">
                    {option.label}
                  </Select.ItemText>
                  <Select.ItemIndicator className="grid size-5 place-items-center rounded-full bg-brand text-brand-foreground">
                    <Check
                      className="size-3"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
