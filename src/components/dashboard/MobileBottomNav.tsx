import React from "react";

export type MobileNavItem<V extends string> = {
  view: V;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * แถบเมนูล่างแบบแอป — แสดงเฉพาะจอมือถือ (< md)
 * เมนูเยอะเกินจอ → เลื่อนแนวนอนได้
 */
export function MobileBottomNav<V extends string>({
  items,
  current,
  onChange,
}: {
  items: MobileNavItem<V>[];
  current: V;
  onChange: (v: V) => void;
}) {
  const many = items.length > 5;
  return (
    <nav
      className="mobile-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-[60] bg-[#0c3123]/90 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className={`flex ${many ? "overflow-x-auto no-scrollbar" : "justify-around"} px-1`}>
        {items.map(({ view, label, icon: Icon }) => {
          const active = view === current;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onChange(view)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 ${many ? "min-w-[68px] shrink-0" : "flex-1"} ${
                active ? "text-emerald-300" : "text-white/55"
              }`}
            >
              <span className={`p-1.5 rounded-full ${active ? "bg-white/10" : ""}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-[10px] leading-none whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
