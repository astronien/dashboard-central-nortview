import React from "react";

/** กันจอขาว — ถ้าหน้าไหนพังตอนแสดงผล ให้โชว์ข้อความ error แทน (ส่วนอื่นยังใช้ได้) */
export class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ViewErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-6 text-white">
        <div className="text-lg font-bold text-rose-200">หน้านี้แสดงผลไม่สำเร็จ{this.props.label ? ` (${this.props.label})` : ""}</div>
        <div className="mt-2 text-sm text-white/70">แคปข้อความด้านล่างส่งให้ผู้ดูแลระบบ</div>
        <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-black/30 p-3 text-[11px] text-rose-100 whitespace-pre-wrap">
          {String(this.state.error?.message ?? this.state.error)}
          {"\n"}
          {String(this.state.error?.stack ?? "").split("\n").slice(0, 6).join("\n")}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
        >
          ลองใหม่
        </button>
      </div>
    );
  }
}
