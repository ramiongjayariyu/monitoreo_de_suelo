import { FormField, Input } from "./primitives";
import { variableRows } from "./soil-variables";
import type { CropRanges, SoilVariable } from "@/types";

export function RangeEditor({
  ranges,
  onChange,
  error,
  description = "Estos rangos son la referencia general del cultivo; cada estado puede definir rangos propios.",
}: {
  ranges: CropRanges;
  onChange: (ranges: CropRanges) => void;
  error?: string;
  description?: string;
}) {
  function setRange(variable: SoilVariable, field: "min" | "max", value: string) {
    const parsed = value === "" || value === "-" ? Number.NaN : Number(value);
    onChange({
      ...ranges,
      [variable]: { ...ranges[variable], [field]: parsed },
    });
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-text-primary">
        Rangos óptimos por variable
      </legend>
      <p className="text-xs text-text-muted">{description}</p>
      <div className="space-y-2">
        {variableRows.map(({ key, label, unit, Icon, color }) => (
          <div
            key={key}
            className="grid grid-cols-[minmax(8rem,1.3fr)_1fr_1fr_3.5rem] items-end gap-2 rounded-md border border-border-default p-3"
          >
            <span
              className={`flex min-h-10 items-center gap-2 text-xs font-medium text-text-secondary sm:text-sm ${color}`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="text-text-secondary">{label}</span>
            </span>
            <FormField label="Mínimo" htmlFor={`range-${key}-min`}>
              <Input
                id={`range-${key}-min`}
                type="number"
                step="any"
                required
                value={Number.isNaN(ranges[key].min) ? "" : ranges[key].min}
                aria-invalid={Boolean(error) || undefined}
                onChange={(event) => setRange(key, "min", event.target.value)}
              />
            </FormField>
            <FormField label="Máximo" htmlFor={`range-${key}-max`}>
              <Input
                id={`range-${key}-max`}
                type="number"
                step="any"
                required
                value={Number.isNaN(ranges[key].max) ? "" : ranges[key].max}
                aria-invalid={Boolean(error) || undefined}
                onChange={(event) => setRange(key, "max", event.target.value)}
              />
            </FormField>
            <span className="min-h-10 pb-3 text-xs text-text-muted">{unit}</span>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
