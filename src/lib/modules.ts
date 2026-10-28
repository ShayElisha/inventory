/** מודולי מכירה — רק אלה ניתנים להפעלה/כיבוי ע״י סופר־אדמין */

export const SELLABLE_MODULES = [
  {
    id: "inbound" as const,
    label: "קליטה",
    description: "קליטת סחורה למלאי",
    flag: "modInbound" as const,
    defaultOn: true,
    navHrefs: ["/inbound", "/purchases"],
    apiPrefixes: ["/api/stock/inbound", "/api/purchase-orders"],
    pagePrefixes: ["/inbound", "/purchases"],
  },
  {
    id: "sales" as const,
    label: "מכירה",
    description: "ניפוק מהיר ותבניות ניפוק",
    flag: "modSales" as const,
    defaultOn: true,
    navHrefs: ["/pick", "/orders", "/documents"],
    apiPrefixes: [
      "/api/stock/outbound",
      "/api/outbound-templates",
      "/api/sales-orders",
      "/api/documents",
    ],
    pagePrefixes: ["/pick", "/orders", "/documents"],
  },
  {
    id: "pick" as const,
    label: "ליקוט",
    description: "רשימות ליקוט ותבניות ליקוט",
    flag: "modPick" as const,
    defaultOn: true,
    navHrefs: ["/picks"],
    apiPrefixes: ["/api/picks", "/api/pick-templates"],
    pagePrefixes: ["/picks"],
  },
  {
    id: "commerce" as const,
    label: "לקוחות ומחירונים",
    description: "כרטיסי לקוח, מחירונים ומחירי לקוח",
    flag: "modCommerce" as const,
    defaultOn: false,
    navHrefs: ["/customers", "/price-lists"],
    apiPrefixes: ["/api/customers", "/api/price-lists"],
    pagePrefixes: ["/customers", "/price-lists"],
  },
  {
    id: "returns" as const,
    label: "החזרות",
    description: "החזרות לקוח (RMA) והחזרה לספק",
    flag: "modReturns" as const,
    defaultOn: false,
    navHrefs: ["/returns"],
    apiPrefixes: ["/api/returns", "/api/stock/rma"],
    pagePrefixes: ["/returns"],
  },
  {
    id: "transfers" as const,
    label: "העברות בין מחסנים",
    description: "מסמכי העברה בין מחסנים ומיקומים",
    flag: "modTransfers" as const,
    defaultOn: false,
    navHrefs: ["/transfers"],
    apiPrefixes: ["/api/transfers"],
    pagePrefixes: ["/transfers"],
  },
  {
    id: "shipments" as const,
    label: "משלוחים ואריזה",
    description: "אריזה, חבילות ומספרי מעקב",
    flag: "modShipments" as const,
    defaultOn: false,
    navHrefs: ["/shipments"],
    apiPrefixes: ["/api/shipments"],
    pagePrefixes: ["/shipments"],
  },
  {
    id: "lots" as const,
    label: "אצוות ותוקף",
    description: "ניהול אצוות, תוקף ו־FEFO",
    flag: "modLots" as const,
    defaultOn: false,
    navHrefs: ["/lots"],
    apiPrefixes: ["/api/lots"],
    pagePrefixes: ["/lots"],
  },
  {
    id: "serials" as const,
    label: "סריאליים",
    description: "מעקב מספרים סידוריים",
    flag: "modSerials" as const,
    defaultOn: false,
    navHrefs: ["/serials"],
    apiPrefixes: ["/api/serials"],
    pagePrefixes: ["/serials"],
  },
  {
    id: "kits" as const,
    label: "קיטים והרכבה",
    description: "הגדרת רכיבים, הרכבה ופירוק",
    flag: "modKits" as const,
    defaultOn: false,
    navHrefs: ["/kits"],
    apiPrefixes: ["/api/kits"],
    pagePrefixes: ["/kits"],
  },
  {
    id: "reorder" as const,
    label: "הזמנות חוזרות",
    description: "כללי מינימום והצעות רכש",
    flag: "modReorder" as const,
    defaultOn: false,
    navHrefs: ["/reorder"],
    apiPrefixes: ["/api/reorder"],
    pagePrefixes: ["/reorder"],
  },
  {
    id: "reportsPro" as const,
    label: "דוחות פרימיום",
    description: "ABC, Aging, רווחיות ותחלופה",
    flag: "modReportsPro" as const,
    defaultOn: false,
    navHrefs: ["/reports-pro"],
    apiPrefixes: ["/api/reports/premium"],
    pagePrefixes: ["/reports-pro"],
  },
] as const;

export type SellableModuleId = (typeof SELLABLE_MODULES)[number]["id"];
export type ModuleFlag = (typeof SELLABLE_MODULES)[number]["flag"];

export type CompanyModules = Record<SellableModuleId, boolean>;

export type CompanyModuleFlags = Partial<Record<ModuleFlag, boolean | null>>;

export const DEFAULT_MODULES: CompanyModules = Object.fromEntries(
  SELLABLE_MODULES.map((m) => [m.id, m.defaultOn])
) as CompanyModules;

export function modulesFromCompany(c: CompanyModuleFlags): CompanyModules {
  const out = { ...DEFAULT_MODULES };
  for (const m of SELLABLE_MODULES) {
    const v = c[m.flag];
    out[m.id] = m.defaultOn ? v !== false : Boolean(v);
  }
  return out;
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
