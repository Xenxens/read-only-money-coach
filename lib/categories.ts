import type {
  NormalizedTransaction,
  TransactionCategory,
} from "@/lib/types";

/**
 * Demo-grade cache. Serverless instances do not share this Map and a redeploy
 * clears it, which is fine for this project.
 */
const categoryCache = new Map<string, TransactionCategory>();

const CATEGORY_KEYWORDS: Array<{
  category: Exclude<TransactionCategory, "income" | "refund" | "other">;
  keywords: string[];
}> = [
  {
    category: "groceries",
    keywords: [
      "whole foods",
      "trader joe",
      "safeway",
      "costco",
      "kroger",
      "aldi",
      "grocery",
      "groceries",
      "supermarket",
      "food market",
      "sprouts",
      "publix",
    ],
  },
  {
    category: "dining",
    keywords: [
      "starbucks",
      "blue bottle",
      "coffee",
      "cafe",
      "restaurant",
      "sweetgreen",
      "doordash",
      "uber eats",
      "grubhub",
      "olive garden",
      "pizza",
      "burger",
      "bakery",
      "dining",
      "taqueria",
    ],
  },
  {
    category: "subscriptions",
    keywords: [
      "netflix",
      "spotify",
      "icloud",
      "apple.com/bill",
      "notion",
      "adobe",
      "hulu",
      "disney+",
      "youtube premium",
      "chatgpt",
      "openai",
      "subscription",
      "membership",
      "dropbox",
      "canva",
    ],
  },
  {
    category: "transport",
    keywords: [
      "uber",
      "lyft",
      "shell",
      "chevron",
      "exxon",
      "bp ",
      "fuel",
      "gas station",
      "metro",
      "transit",
      "parking",
      "toll",
      "amtrak",
    ],
  },
  {
    category: "utilities",
    keywords: [
      "pg&e",
      "pge",
      "electric",
      "water district",
      "comcast",
      "xfinity",
      "verizon",
      "at&t",
      "t-mobile",
      "utility",
      "utilities",
      "internet service",
      "phone bill",
      "sewer",
    ],
  },
];

const REFUND_PATTERN = /\b(refund|refunded|reversal|chargeback)\b/i;
const INCOME_PATTERN =
  /\b(payroll|salary|direct deposit|interest|dividend|payment received|income|stipend|wages)\b/i;

function searchableText(transaction: {
  merchant: string;
  memo: string;
  description: string;
  eventCode: string;
}): string {
  return [
    transaction.merchant,
    transaction.memo,
    transaction.description,
    transaction.eventCode,
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Deterministic keyword categorization runs before any AI involvement.
 * It is cached by PayPal transaction_id.
 */
export function categorizeTransaction(
  transaction: Pick<
    NormalizedTransaction,
    "id" | "merchant" | "memo" | "description" | "amount" | "eventCode"
  >,
): TransactionCategory {
  const cached = categoryCache.get(transaction.id);
  if (cached) {
    return cached;
  }

  const text = searchableText(transaction);
  let category: TransactionCategory;

  if (
    REFUND_PATTERN.test(text) ||
    transaction.eventCode === "T1107" ||
    transaction.eventCode === "T1201"
  ) {
    category = "refund";
  } else if (transaction.amount > 0 && INCOME_PATTERN.test(text)) {
    category = "income";
  } else if (transaction.amount > 0) {
    // Positive, non-refund PayPal activity is treated as income for this
    // simple demo. A production categorizer should distinguish transfers.
    category = "income";
  } else {
    const match = CATEGORY_KEYWORDS.find(({ keywords }) =>
      keywords.some((keyword) => text.includes(keyword)),
    );
    category = match?.category ?? "other";
  }

  if (categoryCache.size > 10_000) {
    categoryCache.clear();
  }
  categoryCache.set(transaction.id, category);

  return category;
}

export function clearCategoryCache(): void {
  categoryCache.clear();
}
