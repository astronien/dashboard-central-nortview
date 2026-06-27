/**
 * Client-side API for managing LINE Bot user allowlist.
 *
 * Admin UI calls these to add/remove/list authorized LINE users
 * who can upload sales files via the LINE Bot.
 */

export interface LineAllowlistUser {
  lineUserId: string;
  displayName: string;
  role: "BSM" | "Asst.BSM";
  branchId: string;
  addedBy: string;
  addedAt: string;
  isActive: boolean;
}

async function request(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

export const lineUserApi = {
  list: () => request("/api/line-bot/users").then((data) => data.users as LineAllowlistUser[]),

  add: (input: {
    lineUserId: string;
    displayName: string;
    role: "BSM" | "Asst.BSM";
    branchId: string;
    addedBy: string;
  }) =>
    request("/api/line-bot/users", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (
    lineUserId: string,
    patch: Partial<Pick<LineAllowlistUser, "displayName" | "role" | "branchId" | "isActive">>,
  ) =>
    request(`/api/line-bot/users?userId=${encodeURIComponent(lineUserId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  remove: (lineUserId: string) =>
    request(`/api/line-bot/users?userId=${encodeURIComponent(lineUserId)}`, {
      method: "DELETE",
    }),
};
