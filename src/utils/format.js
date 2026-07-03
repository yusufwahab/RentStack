export function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PAYMENT_TYPE_BADGE = {
  full: "PAID",
  partial: "PARTIAL",
  overpayment: "OVERPAID",
  disputed: "DISPUTED",
  misdirected: "UNRESOLVED",
  returned: "RETURNED",
};

export function paymentTypeBadge(type) {
  return PAYMENT_TYPE_BADGE[type] || type.toUpperCase();
}

const PAYMENT_TYPE_LABEL = {
  full: "Full payment",
  partial: "Partial payment",
  overpayment: "Overpayment",
  disputed: "Disputed",
  misdirected: "Misdirected",
  returned: "Returned",
};

export function paymentTypeLabel(type) {
  return PAYMENT_TYPE_LABEL[type] || type;
}
