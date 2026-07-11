/**
 * Category target overrides API.
 *
 * GET    /api/category-target-overrides?branch=XXX     → fetch all overrides for branch
 * POST   /api/category-target-overrides                  → upsert single override
 *                                                         body: { branchId, category, target, updatedBy? }
 * DELETE /api/category-target-overrides                  → remove override
 *                                                         body: { branchId, category }
 */
import {
  getCategoryTargetOverrides,
  upsertCategoryTargetOverride,
  deleteCategoryTargetOverride,
  initTelegramSchema,
} from "./_lib/tursoClient.js";

export default async function handler(req, res) {
  try { await initTelegramSchema(); } catch (e) {
    console.error("[category-target-overrides] schema init failed:", e);
  }

  if (req.method === "GET") {
    const branchId = String(req.query.branch ?? "").trim();
    if (!branchId) {
      return res.status(400).json({ error: "Missing branch query param" });
    }
    const overrides = await getCategoryTargetOverrides(branchId);
    return res.status(200).json({ branchId, overrides });
  }

  if (req.method === "POST") {
    const { branchId, category, target, updatedBy } = req.body ?? {};
    if (!branchId || !category) {
      return res.status(400).json({ error: "Missing branchId or category" });
    }
    if (typeof target !== "number" || !Number.isFinite(target) || target < 0) {
      return res.status(400).json({ error: "target must be a non-negative number" });
    }
    await upsertCategoryTargetOverride({ branchId, category, target, updatedBy });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { branchId, category } = req.body ?? {};
    if (!branchId || !category) {
      return res.status(400).json({ error: "Missing branchId or category" });
    }
    await deleteCategoryTargetOverride({ branchId, category });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
