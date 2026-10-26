/** תבניות ענף לעסקים קטנים — קטגוריות, מדפים ומודולים */

export type IndustryId = "fashion" | "food" | "auto_parts" | "garage";

export type IndustryPreset = {
  id: IndustryId;
  name: string;
  tagline: string;
  description: string;
  modules: {
    modLots?: boolean;
    modSerials?: boolean;
    modKits?: boolean;
    modReorder?: boolean;
    modCommerce?: boolean;
  };
  categories: {
    name: string;
    hasVariants: boolean;
    attributeSchema: { key: string; label: string; options?: string[] }[];
  }[];
  locationCodes: string[];
  sampleProducts?: {
    title: string;
    baseSku: string;
    categoryName: string;
    unitOfMeasure?: string;
    trackLots?: boolean;
    trackSerials?: boolean;
    barcode?: string;
  }[];
};

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: "fashion",
    name: "אופנה",
    tagline: "מידות וצבעים, מדפי תלייה",
    description:
      "קטגוריות עם מידה/צבע, מדפים לפי אזור, וקיטים לסטים. מתאים לחנויות בגדים ונעליים.",
    modules: { modKits: true, modReorder: true, modCommerce: true },
    categories: [
      {
        name: "חולצות",
        hasVariants: true,
        attributeSchema: [
          { key: "size", label: "מידה", options: ["XS", "S", "M", "L", "XL"] },
          {
            key: "color",
            label: "צבע",
            options: ["שחור", "לבן", "כחול", "אדום"],
          },
        ],
      },
      {
        name: "מכנסיים",
        hasVariants: true,
        attributeSchema: [
          { key: "size", label: "מידה", options: ["36", "38", "40", "42", "44"] },
          { key: "color", label: "צבע", options: ["שחור", "כחול", "בז׳"] },
        ],
      },
      {
        name: "אקססוריז",
        hasVariants: false,
        attributeSchema: [],
      },
    ],
    locationCodes: ["A1", "A2", "B1", "B2", "C1", "תלייה-1", "תלייה-2"],
    sampleProducts: [
      {
        title: "חולצת דוגמה",
        baseSku: "SHIRT-DEMO",
        categoryName: "חולצות",
        barcode: "SHIRT-DEMO-1",
      },
    ],
  },
  {
    id: "food",
    name: "מזון",
    tagline: "אצוות ותוקף, קירור/יבש",
    description:
      "מדפי קירור ויבש, מעקב אצוות ותפוגה, יחידות בק״ג/ליטר. מתאים למכולת, קייטרינג ומחסן מזון.",
    modules: { modLots: true, modReorder: true },
    categories: [
      {
        name: "מוצרי חלב",
        hasVariants: false,
        attributeSchema: [],
      },
      {
        name: "יבשים",
        hasVariants: false,
        attributeSchema: [],
      },
      {
        name: "קפואים",
        hasVariants: false,
        attributeSchema: [],
      },
    ],
    locationCodes: ["קירור-1", "קירור-2", "יבש-A1", "יבש-A2", "קפוא-1"],
    sampleProducts: [
      {
        title: "חלב 3% דוגמה",
        baseSku: "MILK-DEMO",
        categoryName: "מוצרי חלב",
        unitOfMeasure: "LITER",
        trackLots: true,
        barcode: "MILK-DEMO-1",
      },
    ],
  },
  {
    id: "auto_parts",
    name: "חלקי חילוף",
    tagline: "מק״טים מדויקים, מדפים לפי מערכת",
    description:
      "קטגוריות לפי מערכת רכב, אפשרות סריאליים לחלקים יקרים, ומדפים מסודרים.",
    modules: { modSerials: true, modReorder: true, modCommerce: true },
    categories: [
      {
        name: "בלמים",
        hasVariants: false,
        attributeSchema: [],
      },
      {
        name: "פילטרים",
        hasVariants: false,
        attributeSchema: [],
      },
      {
        name: "חשמל",
        hasVariants: true,
        attributeSchema: [
          { key: "voltage", label: "מתח", options: ["12V", "24V"] },
        ],
      },
    ],
    locationCodes: ["BL-01", "FL-01", "EL-01", "EL-02", "GEN-01"],
    sampleProducts: [
      {
        title: "פילטר שמן דוגמה",
        baseSku: "OIL-F-DEMO",
        categoryName: "פילטרים",
        barcode: "OIL-F-DEMO-1",
      },
    ],
  },
  {
    id: "garage",
    name: "מוסכים",
    tagline: "חלקים + ערכות שירות",
    description:
      "שילוב חלפים עם קיטי טיפול, מדפי עבודה וסריאליים לחלקים יקרים.",
    modules: {
      modKits: true,
      modSerials: true,
      modReorder: true,
      modCommerce: true,
    },
    categories: [
      {
        name: "שמנים ונוזלים",
        hasVariants: false,
        attributeSchema: [],
      },
      {
        name: "חלקי שירות",
        hasVariants: false,
        attributeSchema: [],
      },
      {
        name: "ערכות טיפול",
        hasVariants: false,
        attributeSchema: [],
      },
    ],
    locationCodes: ["עבודה-1", "עבודה-2", "מלאי-A1", "מלאי-A2", "שמנים"],
    sampleProducts: [
      {
        title: "שמן מנוע 5W40 דוגמה",
        baseSku: "OIL5W40-DEMO",
        categoryName: "שמנים ונוזלים",
        unitOfMeasure: "LITER",
        barcode: "OIL5W40-DEMO-1",
      },
    ],
  },
];

export function getIndustryPreset(id: string): IndustryPreset | undefined {
  return INDUSTRY_PRESETS.find((p) => p.id === id);
}
