import { Building2, ImagePlus, Trash2, Users } from "lucide-react";

export type StaffRosterEntry = {
  name: string;
  staffId: string;
  officerKey: string;
  branch?: string;
};

export function SettingsSection({
  selectedBranch,
  onBranchChange,
  sheetBranches,
  staffRoster,
  staffPhotos,
  uploadingPhotoId,
  staffPhotoError,
  getStaffAvatar,
  onPhotoUpload,
  onPhotoRemove,
  onNavigateToReports,
}: {
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  sheetBranches: string[];
  staffRoster: StaffRosterEntry[];
  staffPhotos: Record<string, string>;
  uploadingPhotoId: string | null;
  staffPhotoError: string | null;
  getStaffAvatar: (photos: Record<string, string>, entry: { staffId: string; officerKey: string; fallbackIndex: number }) => string;
  onPhotoUpload: (entry: StaffRosterEntry, file: File) => void;
  onPhotoRemove: (staffId: string) => void;
  onNavigateToReports: () => void;
}) {
  return (
    <>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><Building2 className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">เลือกสาขาประจำแดชบอร์ด</h2>
            <p className="text-sm text-white/60 mt-1">เลือกสาขาที่ต้องการดูบนแดชบอร์ด Live Sync ดึงข้อมูลทุกสาขาลงฐานข้อมูล — การเลือกสาขานี้กรองเฉพาะการแสดงผล</p>
          </div>
        </div>
        <div className="w-full lg:w-72 shrink-0">
          <select
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            className="w-full bg-[#051710] border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all cursor-pointer shadow-lg"
          >
            {(sheetBranches.length > 0 ? sheetBranches : [
              "Mega Bangna", "Central World", "Central Rama 9", "Iconsiam",
              "Central Phitsanulok", "Central Plaza Rayong", "Central Chiangmai Airport", "Central Plaza Westgate",
            ]).map((br) => (
              <option key={br} value={br} className="bg-[#051710] text-white">
                {br.includes(":") ? br.replace(/^ID\d+\s*:\s*/, "") : (br.startsWith("iStudio") || br.startsWith("Studio 7") ? br : `iStudio ${br}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><ImagePlus className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">รูปประจำตัวพนักงาน</h2>
            <p className="text-sm text-white/60 mt-1">รูปภาพจะแสดงในหน้าข้อมูลพนักงาน บอร์ดจัดอันดับ และตารางการขายร่วม (Attach) จำเป็นต้องอัปโหลดข้อมูลเป้าหมาย (Target) ในส่วนรายงานก่อน จึงจะแสดงรายชื่อพนักงาน</p>
          </div>
        </div>
        {staffPhotoError && <p className="text-sm text-amber-300 lg:max-w-xs">{staffPhotoError}</p>}
      </div>

      <div className="flex-1 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative z-10 w-full min-h-[400px] overflow-hidden flex flex-col">
        {staffRoster.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <Users className="w-14 h-14 text-white/20 mb-4" />
            <h3 className="text-lg font-semibold mb-2">ไม่พบข้อมูลพนักงาน</h3>
            <p className="text-white/60 text-sm max-w-md mb-4">กรุณาอัปโหลดเป้าหมายยอดขาย (Target Excel) ในหน้ารายงานก่อน หรืออัปโหลดรายงานยอดขายที่มีรายชื่อพนักงาน</p>
            <button type="button" onClick={onNavigateToReports} className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/30 transition-colors">ไปที่หน้ารายงานเพื่ออัปโหลด</button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            <p className="text-xs text-white/50 mb-3">ทั้งหมด {staffRoster.length} คน · รองรับ PNG/WebP (พื้นหลังโปร่งใส) · JPG จะถูกบีบอัดอัตโนมัติ</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {staffRoster.map((entry, index) => {
                const avatar = getStaffAvatar(staffPhotos, { staffId: entry.staffId, officerKey: entry.officerKey, fallbackIndex: index });
                const hasCustom = Boolean(staffPhotos[entry.staffId]);
                const isUploading = uploadingPhotoId === entry.staffId;
                return (
                  <div key={entry.staffId} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/[0.07] transition-colors">
                    <img src={avatar} alt={entry.name} className="w-14 h-14 rounded-full object-cover object-top bg-emerald-500/20 shrink-0 border border-white/10" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{entry.name}</p>
                      <p className="text-xs text-white/50 truncate">{entry.branch || "—"}{entry.staffId && entry.staffId !== entry.officerKey ? ` · ID ${entry.staffId}` : ""}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <label className={`cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${isUploading ? "bg-white/5 text-white/40 pointer-events-none" : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/20"}`}>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={isUploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) onPhotoUpload(entry, file); e.target.value = ""; }} />
                        <ImagePlus className="w-3.5 h-3.5" /> {isUploading ? "กำลังอัปโหลด..." : hasCustom ? "เปลี่ยนรูป" : "อัปโหลด"}
                      </label>
                      {hasCustom && (
                        <button type="button" disabled={isUploading} onClick={() => onPhotoRemove(entry.staffId)} className="inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /> ลบรูปภาพ</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
