const URLS = {
  auth: "https://functions.poehali.dev/629b9712-3c8d-4a72-93fd-56520ca3d5c5",
  cases: "https://functions.poehali.dev/409b8fb0-af2a-49b8-b696-2642b830f38f",
  upgrade: "https://functions.poehali.dev/2151941e-e791-442e-8a93-d5426d7a3970",
  balance: "https://functions.poehali.dev/51bb981d-d9f1-451d-8389-e55931b3456f",
  profile: "https://functions.poehali.dev/311b7509-d3e1-414d-9ca5-6601f2f47958",
};

function getToken(): string | null {
  return localStorage.getItem("cld_token");
}

async function req(url: string, method = "GET", body?: object): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Auth-Token"] = token;
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const api = {
  // Auth
  register: (data: { username: string; email: string; password: string }) =>
    req(`${URLS.auth}/register`, "POST", data),
  login: (data: { username: string; password: string }) =>
    req(`${URLS.auth}/login`, "POST", data),
  logout: () => req(`${URLS.auth}/logout`, "POST"),
  me: () => req(`${URLS.auth}/me`),

  // Cases
  getCases: () => req(URLS.cases),
  getCaseSkins: (caseId: number) => req(`${URLS.cases}/${caseId}/skins`),
  openCase: (caseId: number) => req(`${URLS.cases}/open`, "POST", { case_id: caseId }),

  // Upgrade
  getUpgradeSkins: () => req(URLS.upgrade),
  doUpgrade: (inventoryId: number, targetSkinId: number) =>
    req(URLS.upgrade, "POST", { inventory_id: inventoryId, target_skin_id: targetSkinId }),

  // Balance
  getBalance: () => req(URLS.balance),
  deposit: (amount: number) => req(`${URLS.balance}/deposit`, "POST", { amount }),
  withdraw: (amount: number, paymentDetails: string) =>
    req(`${URLS.balance}/withdraw`, "POST", { amount, payment_details: paymentDetails }),
  sellSkin: (inventoryId: number) =>
    req(`${URLS.balance}/sell`, "POST", { inventory_id: inventoryId }),

  // Profile
  getProfile: () => req(URLS.profile),
};

export { getToken };
