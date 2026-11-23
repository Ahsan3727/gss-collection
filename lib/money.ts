export function formatMoney(amount: number, currency: string = "PKR"): string {
  if (currency === "USD") {
    return "$" + (amount / 280).toFixed(2);
  }
  return "Rs. " + Math.round(amount).toLocaleString("en-PK");
}
