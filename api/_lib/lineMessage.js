/**
 * Build LINE reply messages: text + Flex.
 *
 * - buildReplyMessage: success — text + Flex summary
 * - buildErrorFlex: error — red Flex box
 *
 * All messages use Flex Message (bubble) for consistent layout.
 * No push messages — uses reply token only.
 */

function fmtBaht(n) {
  if (!n) return "฿0";
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(1)}K`;
  return `฿${Math.round(n).toLocaleString()}`;
}

function fmtPct(n) {
  if (!n || n < 0) return "0%";
  return `${n.toFixed(1)}%`;
}

/**
 * Build success reply: text + Flex summary.
 * Returns array of 2 messages: [text, flex]
 */
export function buildReplyMessage({ fileName, rows, branchId, targetTotal, actualTotal, achPct, topOfficers }) {
  const textMsg = {
    type: "text",
    text: `✅ อัปโหลด Current ${branchId || ""} สำเร็จ: ${rows?.toLocaleString() || 0} แถว`,
  };
  const flexMsg = buildSuccessFlex({ fileName, rows, branchId, targetTotal, actualTotal, achPct, topOfficers });
  return [textMsg, flexMsg];
}

/**
 * Success Flex Message — green theme with stats.
 */
function buildSuccessFlex({ fileName, rows, branchId, targetTotal, actualTotal, achPct, topOfficers }) {
  const achColor = achPct >= 100 ? "#10b981" : achPct >= 80 ? "#f59e0b" : "#ef4444";

  const officerRows = (topOfficers || []).slice(0, 3).map((o, i) => ({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      { type: "text", text: `${i + 1}.`, size: "xs", color: "#6b7280", flex: 0 },
      { type: "text", text: o.name, size: "xs", color: "#1f2937", flex: 4, wrap: true },
      { type: "text", text: fmtBaht(o.amount), size: "xs", color: "#059669", align: "end", flex: 2 },
    ],
  }));

  return {
    type: "flex",
    altText: `อัปโหลดสำเร็จ ${rows} แถว — Target ${fmtBaht(targetTotal)} | Actual ${fmtBaht(actualTotal)} | ${fmtPct(achPct)}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10b981",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📊 อัปโหลดสำเร็จ", color: "#ffffff", size: "lg", weight: "bold" },
          { type: "text", text: branchId || "ไม่ระบุสาขา", color: "#ffffffcc", size: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "lg",
        contents: [
          {
            type: "box",
            layout: "vertical",
            margin: "sm",
            contents: [
              { type: "text", text: "📁 ไฟล์", size: "xs", color: "#6b7280" },
              { type: "text", text: fileName || "—", size: "sm", color: "#1f2937", wrap: true },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            contents: [
              { type: "text", text: "📊 จำนวนแถว", size: "xs", color: "#6b7280" },
              { type: "text", text: `${(rows || 0).toLocaleString()} แถว`, size: "md", color: "#1f2937", weight: "bold" },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            contents: [
              { type: "separator", color: "#e5e7eb" },
              { type: "text", text: "TARGET vs ACTUAL", size: "xs", color: "#6b7280", margin: "md" },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "sm",
            contents: [
              { type: "text", text: "Target", size: "sm", color: "#1f2937", flex: 1 },
              { type: "text", text: fmtBaht(targetTotal), size: "sm", color: "#1f2937", align: "end", flex: 1, weight: "bold" },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "sm",
            contents: [
              { type: "text", text: "Actual", size: "sm", color: "#1f2937", flex: 1 },
              { type: "text", text: fmtBaht(actualTotal), size: "sm", color: "#1f2937", align: "end", flex: 1, weight: "bold" },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              { type: "text", text: "Ach%", size: "md", color: "#1f2937", flex: 1, weight: "bold" },
              { type: "text", text: fmtPct(achPct), size: "xl", color: achColor, align: "end", flex: 1, weight: "bold" },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "lg",
        contents: [
          ...(officerRows.length > 0
            ? [
                { type: "separator", color: "#e5e7eb" },
                { type: "text", text: "🏆 Top Officers", size: "xs", color: "#6b7280", margin: "sm" },
                ...officerRows,
              ]
            : []),
          {
            type: "text",
            text: "✅ บันทึกเรียบร้อย",
            size: "xs",
            color: "#10b981",
            align: "center",
            margin: "lg",
          },
        ],
      },
    },
  };
}

/**
 * Error Flex Message — red theme.
 */
export function buildErrorFlex(message) {
  return {
    type: "flex",
    altText: `❌ ${message}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#ef4444",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "❌ อัปโหลดไม่สำเร็จ", color: "#ffffff", size: "md", weight: "bold" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: message || "Unknown error", color: "#1f2937", size: "sm", wrap: true },
        ],
      },
    },
  };
}
