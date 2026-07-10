// Postgres/Supabase rows are snake_case and flat; every page/component was
// built against the mock's camelCase, sometimes-nested shape. These
// mappers are the one place that translation happens, so no page or
// component needs to know the backend's actual column names.

export function mapLandlord(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    property: { name: row.property_name, address: row.property_address },
    rentPerUnit: row.rent_per_unit,
  };
}

export function mapTenant(row) {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    email: row.email,
    phone: row.phone,
    virtualAccountNumber: row.virtual_account_number,
    bankName: row.bank_name,
    accountName: row.account_name,
    moveInDate: row.move_in_date,
    moveOutDate: row.move_out_date || undefined,
    rentAmount: Number(row.rent_amount),
    status: row.status,
    kycTier: row.kyc_tier,
    creditBalance: Number(row.credit_balance || 0),
    leaseEndDate: row.lease_end_date || undefined,
    serviceCharge: Number(row.service_charge || 0),
    guarantorName: row.guarantor_name || undefined,
    guarantorPhone: row.guarantor_phone || undefined,
    guarantorRelationship: row.guarantor_relationship || undefined,
    currentCycle: row.currentCycle
      ? {
          due: Number(row.currentCycle.due),
          paid: Number(row.currentCycle.paid),
          balance: Number(row.currentCycle.balance),
          credit: Number(row.currentCycle.credit),
          creditApplied: Number(row.currentCycle.creditApplied || 0),
        }
      : undefined,
    disputeNote:
      row.status === "DISPUTED"
        ? "A payment this cycle could not be verified against this tenant's registered name and is pending review."
        : undefined,
  };
}

export function mapPayment(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    amount: Number(row.amount),
    type: row.type,
    date: row.occurred_at,
    reference: row.reference,
    senderBank: row.sender_bank,
    senderAccountName: row.sender_account_name,
    tenantName: row.tenantName,
    unit: row.unit,
  };
}

export function mapDeposit(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    amount: Number(row.amount),
    status: row.status,
    deductions: Number(row.deductions || 0),
    deductionReason: row.deduction_reason || undefined,
    receivedAt: row.received_at,
    refundedAt: row.refunded_at || undefined,
  };
}

export function mapMaintenanceRequest(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenantName,
    unit: row.unit,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  };
}

// "YYYY-MM" -> "July 2026"
export function cycleKeyToLabel(cycleKey) {
  const [y, m] = cycleKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}
