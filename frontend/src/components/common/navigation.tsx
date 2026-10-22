import { useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb && (
          <p className="mb-2 text-xs text-text-muted">
            {breadcrumb.map((item, index) => (
              <span key={`${item}-${index}`}>
                {index > 0 && <span className="px-1.5">/</span>}
                {item}
              </span>
            ))}
          </p>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, defaultTab }: { items: TabItem[]; defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab || items[0]?.id || "");
  const activeItem = items.find((item) => item.id === activeTab);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Secciones"
        className="flex gap-1 overflow-x-auto border-b border-border-default"
      >
        {items.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={activeTab === item.id ? 0 : -1}
            onClick={() => setActiveTab(item.id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
              event.preventDefault();
              const currentIndex = items.findIndex((tab) => tab.id === activeTab);
              const offset = event.key === "ArrowRight" ? 1 : -1;
              const next = items[(currentIndex + offset + items.length) % items.length];
              setActiveTab(next.id);
              document.getElementById(`tab-${next.id}`)?.focus();
            }}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              activeTab === item.id
                ? "border-primary-500 text-primary-700"
                : "border-transparent text-text-secondary hover:text-primary-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem && (
        <div
          id={`panel-${activeItem.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeItem.id}`}
          className="pt-5"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
