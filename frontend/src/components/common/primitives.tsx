import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-primary-700 text-white hover:bg-primary-500",
    secondary: "border border-border-default bg-white text-primary-700 hover:bg-elevated",
    danger: "bg-danger text-white hover:bg-red-700",
    ghost: "text-primary-700 hover:bg-primary-100",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "min-h-8 px-3 text-xs",
    md: "min-h-10 px-4 text-sm",
    lg: "min-h-12 px-5 text-base",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-elevated disabled:text-text-muted disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});

export const LoadingButton = Button;

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  function Label({ className, ...props }, ref) {
    return (
      <label
        ref={ref}
        className={cn("mb-1.5 block text-sm font-medium text-text-secondary", className)}
        {...props}
      />
    );
  },
);

const fieldClass =
  "min-h-10 w-full rounded-sm border border-border-default bg-white px-3 text-sm text-text-primary shadow-sm outline-none transition placeholder:text-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-elevated disabled:text-text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-red-100";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldClass, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldClass, "min-h-24 py-2", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(fieldClass, "pr-8", className)} {...props}>
      {children}
    </select>
  );
});

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Checkbox({ className, type: _type, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "size-4 rounded border-border-default text-primary-700 accent-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export const Radio = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Radio({ className, type: _type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="radio"
        className={cn(
          "size-4 border-border-default text-primary-700 accent-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { className, label, checked, ...props },
  ref,
) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        checked={checked}
        className={cn("peer sr-only", className)}
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative h-6 w-11 rounded-full bg-neutral transition-colors peer-checked:bg-primary-700 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5",
        )}
      />
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </label>
  );
});

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const messageId = `${htmlFor}-message`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {(error || hint) && (
        <p
          id={messageId}
          className={cn("text-xs", error ? "text-danger" : "text-text-muted")}
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
