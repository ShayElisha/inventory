/** מודולי מכירה — רק אלה ניתנים להפעלה/כיבוי ע״י סופר־אדמין */

export const SELLABLE_MODULES = [
  {
    id: "inbound" as const,
    label: "קליטה",
    description: "קליטת סחורה למלאי",
    navHrefs: ["/inbound", "/purchases"],
    apiPrefixes: ["/api/stock/inbound", "/api/purchase-orders"],
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
    apiPrefixes: ["/api/picks", "/api/pick-templates"],
    pagePrefixes: ["/picks"],
  },
  {
    id: "commerce" as const,
    label: "לקוחות ומחירונים",
    description: "כרטיסי לקוח, מחירונים ומחירי לקוח",
    navHrefs: ["/customers", "/price-lists"],
    apiPrefixes: ["/api/customers", "/api/price-lists"],
    pagePrefixes: ["/customers", "/price-lists"],
  },
  {
    id: "returns" as const,
    label: "החזרות",
    description: "החזרות לקוח (RMA) והחזרה לספק",
    navHrefs: ["/returns"],
    apiPrefixes: ["/api/returns", "/api/stock/rma"],
    pagePrefixes: ["/returns"],
  },
] as const;

export type SellableModuleId = (typeof SELLABLE_MODULES)[number]["id"];

export type CompanyModules = Record<SellableModuleId, boolean>;

export const DEFAULT_MODULES: CompanyModules = {
  inbound: true,
  sales: true,
  pick: true,
  commerce: false,
  returns: false,
};

export function modulesFromCompany(c: {
  modInbound?: boolean;
  modSales?: boolean;
  modPick?: boolean;
  modCommerce?: boolean;
  modReturns?: boolean;
}): CompanyModules {
  return {
    inbound: c.modInbound !== false,
    sales: c.modSales !== false,
    pick: c.modPick !== false,
    commerce: Boolean(c.modCommerce),
    returns: Boolean(c.modReturns),
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
