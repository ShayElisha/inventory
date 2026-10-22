/** מודולי מכירה — רק אלה ניתנים להפעלה/כיבוי ע״י סופר־אדמין */

export const SELLABLE_MODULES = [
  {
    id: "inbound" as const,
    label: "קליטה",
    description: "קליטת סחורה למלאי",
    navHrefs: ["/inbound", "/purchases"],
    apiPrefixes: ["/api/stock/inbound", "/api/purchase-orders", "/api/stock/rma"],
    pagePrefixes: ["/inbound", "/purchases"],
  },
  {
    id: "sales" as const,
    label: "מכירה",
    description: "ניפוק מהיר ותבניות ניפוק",
    navHrefs: ["/pick", "/orders"],
    apiPrefixes: [
      "/api/stock/outbound",
      "/api/outbound-templates",
      "/api/sales-orders",
    ],
    pagePrefixes: ["/pick", "/orders"],
  },
  {
    id: "pick" as const,
    label: "ליקוט",
    description: "רשימות ליקוט ותבניות ליקוט",
    navHrefs: ["/picks"],
    apiPrefixes: [
      "/api/picks",
      "/api/pick-templates",
    ],
    pagePrefixes: ["/picks"],
  },
] as const;

export type SellableModuleId = (typeof SELLABLE_MODULES)[number]["id"];

export type CompanyModules = Record<SellableModuleId, boolean>;

export const DEFAULT_MODULES: CompanyModules = {
  inbound: true,
  sales: true,
  pick: true,
};

export function modulesFromCompany(c: {
  modInbound?: boolean;
  modSales?: boolean;
  modPick?: boolean;
}): CompanyModules {
  return {
    inbound: c.modInbound !== false,
    sales: c.modSales !== false,
    pick: c.modPick !== false,
  };
}

export function moduleForPath(pathname: string): SellableModuleId | null {
  for (const m of SELLABLE_MODULES) {
    if (
      m.pagePrefixes.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      ) ||
      m.apiPrefixes.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      )
    ) {
      return m.id;
    }
  }
  return null;
}

export function isModuleEnabled(
  modules: CompanyModules,
  id: SellableModuleId
) {
  return Boolean(modules[id]);
}

export function navHrefAllowed(href: string, modules: CompanyModules) {
  for (const m of SELLABLE_MODULES) {
    if ((m.navHrefs as readonly string[]).includes(href)) {
      return isModuleEnabled(modules, m.id);
    }
  }
  return true;
}
