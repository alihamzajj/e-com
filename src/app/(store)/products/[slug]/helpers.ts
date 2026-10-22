import { formatMoney } from "@/lib/utils/format";
import type { StoreSettings } from "@/types/domain";

export { computeUnitPrice } from "@/lib/pricing";

export function formatMoneyPlain(amount: number, settings: Pick<StoreSettings, "currency" | "locale">) {
  return formatMoney(amount, settings.currency, settings.locale);
}
