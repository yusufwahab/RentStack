// Single source of truth for all mock data across the app.
// Current cycle is treated as July 2026 (today = 2026-07-03).

export const mockLandlord = {
  id: "landlord-001",
  name: "Abdulwahab Yusuf",
  email: "abdulwahab@rentstack.com",
  phone: "08031234567",
  property: {
    name: "Sunshine Court",
    address: "14 Admiralty Way, Lekki Phase 1, Lagos",
  },
  rentPerUnit: 85000,
  password: "password123",
};

export const CURRENT_CYCLE = "2026-07";
export const CURRENT_CYCLE_LABEL = "July 2026";

export const mockProperties = [
  {
    id: "prop-001",
    name: "Sunshine Court",
    address: "14 Admiralty Way, Lekki Phase 1, Lagos",
  },
];

export const mockTenants = [
  {
    id: "t-001",
    propertyId: "prop-001",
    name: "Chiamaka Eze",
    unit: "Flat 1A",
    email: "chiamaka.eze@gmail.com",
    phone: "08023456781",
    virtualAccountNumber: "8123456701",
    bankName: "Wema Bank",
    accountName: "Chiamaka Eze",
    moveInDate: "2023-03-01",
    rentAmount: 85000,
    status: "PAID",
    creditBalance: 0,
    currentCycle: { due: 85000, paid: 85000, balance: 0, credit: 0, creditApplied: 0 },
    kycTier: "Tier 3",
  },
  {
    id: "t-002",
    propertyId: "prop-001",
    name: "Tunde Bakare",
    unit: "Flat 1B",
    email: "tunde.bakare@yahoo.com",
    phone: "08134567892",
    virtualAccountNumber: "8234567812",
    bankName: "Sterling Bank",
    accountName: "Tunde Bakare",
    moveInDate: "2023-05-15",
    rentAmount: 85000,
    status: "PAID",
    creditBalance: 0,
    currentCycle: { due: 85000, paid: 85000, balance: 0, credit: 0, creditApplied: 0 },
    kycTier: "Tier 3",
  },
  {
    id: "t-003",
    propertyId: "prop-001",
    name: "Ngozi Umeh",
    unit: "Flat 2A",
    email: "ngozi.umeh@gmail.com",
    phone: "08045678923",
    virtualAccountNumber: "8345678923",
    bankName: "Wema Bank",
    accountName: "Ngozi Umeh",
    moveInDate: "2023-07-01",
    rentAmount: 85000,
    status: "PARTIAL",
    creditBalance: 0,
    currentCycle: { due: 85000, paid: 45000, balance: 40000, credit: 0, creditApplied: 0 },
    kycTier: "Tier 2",
  },
  {
    id: "t-004",
    propertyId: "prop-001",
    name: "Emeka Okafor",
    unit: "Flat 2B",
    email: "emeka.okafor@outlook.com",
    phone: "08156789034",
    virtualAccountNumber: "8456789034",
    bankName: "Sterling Bank",
    accountName: "Emeka Okafor",
    moveInDate: "2023-09-10",
    rentAmount: 85000,
    status: "PARTIAL",
    creditBalance: 0,
    currentCycle: { due: 85000, paid: 60000, balance: 25000, credit: 0, creditApplied: 0 },
    kycTier: "Tier 2",
    kycTierChange: {
      from: "Tier 3",
      to: "Tier 2",
      date: "2026-06-28",
      reason: "BVN re-verification required by bank — account downgraded pending update.",
    },
  },
  {
    id: "t-005",
    propertyId: "prop-001",
    name: "Fatima Sule",
    unit: "Flat 3A",
    email: "fatima.sule@gmail.com",
    phone: "08067890145",
    virtualAccountNumber: "8567890145",
    bankName: "Wema Bank",
    accountName: "Fatima Sule",
    moveInDate: "2024-01-05",
    rentAmount: 85000,
    status: "UNPAID",
    creditBalance: 0,
    currentCycle: { due: 85000, paid: 0, balance: 85000, credit: 0, creditApplied: 0 },
    kycTier: "Tier 1",
  },
  {
    id: "t-006",
    propertyId: "prop-001",
    name: "Ibrahim Musa",
    unit: "Flat 3B",
    email: "ibrahim.musa@gmail.com",
    phone: "08178901256",
    virtualAccountNumber: "8678901256",
    bankName: "Sterling Bank",
    accountName: "Ibrahim Musa",
    moveInDate: "2023-11-01",
    rentAmount: 85000,
    status: "OVERPAID",
    creditBalance: 15000,
    currentCycle: { due: 85000, paid: 100000, balance: 0, credit: 15000, creditApplied: 0 },
    kycTier: "Tier 3",
  },
  {
    id: "t-007",
    propertyId: "prop-001",
    name: "Blessing Okonkwo",
    unit: "Flat 4A",
    email: "blessing.okonkwo@gmail.com",
    phone: "08089012367",
    virtualAccountNumber: "8789012367",
    bankName: "Wema Bank",
    accountName: "Blessing Okonkwo",
    moveInDate: "2023-06-01",
    rentAmount: 85000,
    status: "DISPUTED",
    creditBalance: 0,
    currentCycle: { due: 85000, paid: 85000, balance: 0, credit: 0, creditApplied: 0 },
    disputeNote:
      "Payment of ₦85,000 was received on this account, but the sender name (\"Kelechi Nwosu\") does not match the registered tenant. Flagged for manual review before the payment is confirmed.",
    kycTier: "Tier 3",
  },
  {
    id: "t-008",
    propertyId: "prop-001",
    name: "Segun Adebayo",
    unit: "Flat 4B",
    email: "segun.adebayo@yahoo.com",
    phone: "08190123478",
    virtualAccountNumber: "8890123478",
    bankName: "Sterling Bank",
    accountName: "Segun Adebayo",
    moveInDate: "2022-08-01",
    moveOutDate: "2026-05-15",
    rentAmount: 85000,
    status: "CLOSED",
    creditBalance: 0,
    currentCycle: { due: 0, paid: 0, balance: 0, credit: 0, creditApplied: 0 },
    kycTier: "Tier 2",
  },
];

// Every payment event RentStack has ever captured, across all tenants.
// `tenantId: null` marks a misdirected payment with no matching tenant.
export const mockPayments = [
  // Chiamaka Eze — t-001 — PAID every cycle
  { id: "p-0001", tenantId: "t-001", amount: 85000, type: "full", date: "2026-04-03T09:12:00", reference: "NMB-2604030091", senderBank: "Wema Bank", senderAccountName: "Chiamaka Eze" },
  { id: "p-0002", tenantId: "t-001", amount: 85000, type: "full", date: "2026-05-02T10:05:00", reference: "NMB-2605020091", senderBank: "Wema Bank", senderAccountName: "Chiamaka Eze" },
  { id: "p-0003", tenantId: "t-001", amount: 85000, type: "full", date: "2026-06-01T08:40:00", reference: "NMB-2606010091", senderBank: "Wema Bank", senderAccountName: "Chiamaka Eze" },
  { id: "p-0004", tenantId: "t-001", amount: 85000, type: "full", date: "2026-07-01T09:00:00", reference: "NMB-2607010091", senderBank: "Wema Bank", senderAccountName: "Chiamaka Eze" },

  // Tunde Bakare — t-002 — PAID every cycle
  { id: "p-0005", tenantId: "t-002", amount: 85000, type: "full", date: "2026-04-02T11:22:00", reference: "NMB-2604020092", senderBank: "Sterling Bank", senderAccountName: "Tunde Bakare" },
  { id: "p-0006", tenantId: "t-002", amount: 85000, type: "full", date: "2026-05-03T13:15:00", reference: "NMB-2605030092", senderBank: "Sterling Bank", senderAccountName: "Tunde Bakare" },
  { id: "p-0007", tenantId: "t-002", amount: 85000, type: "full", date: "2026-06-02T14:02:00", reference: "NMB-2606020092", senderBank: "Sterling Bank", senderAccountName: "Tunde Bakare" },
  { id: "p-0008", tenantId: "t-002", amount: 85000, type: "full", date: "2026-07-02T10:30:00", reference: "NMB-2607020092", senderBank: "Sterling Bank", senderAccountName: "Tunde Bakare" },

  // Ngozi Umeh — t-003 — PARTIAL this cycle (two transfers), full in prior months
  { id: "p-0009", tenantId: "t-003", amount: 85000, type: "full", date: "2026-04-05T15:40:00", reference: "NMB-2604050093", senderBank: "Wema Bank", senderAccountName: "Ngozi Umeh" },
  { id: "p-0010", tenantId: "t-003", amount: 85000, type: "full", date: "2026-05-04T09:50:00", reference: "NMB-2605040093", senderBank: "Wema Bank", senderAccountName: "Ngozi Umeh" },
  { id: "p-0011", tenantId: "t-003", amount: 85000, type: "full", date: "2026-06-05T12:10:00", reference: "NMB-2606050093", senderBank: "Wema Bank", senderAccountName: "Ngozi Umeh" },
  { id: "p-0012", tenantId: "t-003", amount: 25000, type: "partial", date: "2026-07-01T08:20:00", reference: "NMB-2607010093", senderBank: "Wema Bank", senderAccountName: "Ngozi Umeh" },
  { id: "p-0013", tenantId: "t-003", amount: 20000, type: "partial", date: "2026-07-03T17:45:00", reference: "NMB-2607030093", senderBank: "Wema Bank", senderAccountName: "Ngozi Umeh" },

  // Emeka Okafor — t-004 — PARTIAL this cycle (two transfers), full in prior months
  { id: "p-0014", tenantId: "t-004", amount: 85000, type: "full", date: "2026-04-06T10:00:00", reference: "NMB-2604060094", senderBank: "Sterling Bank", senderAccountName: "Emeka Okafor" },
  { id: "p-0015", tenantId: "t-004", amount: 85000, type: "full", date: "2026-05-07T11:35:00", reference: "NMB-2605070094", senderBank: "Sterling Bank", senderAccountName: "Emeka Okafor" },
  { id: "p-0016", tenantId: "t-004", amount: 85000, type: "full", date: "2026-06-06T09:18:00", reference: "NMB-2606060094", senderBank: "Sterling Bank", senderAccountName: "Emeka Okafor" },
  { id: "p-0017", tenantId: "t-004", amount: 40000, type: "partial", date: "2026-07-01T13:00:00", reference: "NMB-2607010094", senderBank: "Sterling Bank", senderAccountName: "Emeka Okafor" },
  { id: "p-0018", tenantId: "t-004", amount: 20000, type: "partial", date: "2026-07-02T16:22:00", reference: "NMB-2607020094", senderBank: "Sterling Bank", senderAccountName: "Emeka Okafor" },

  // Fatima Sule — t-005 — UNPAID this cycle, was paying fully before
  { id: "p-0019", tenantId: "t-005", amount: 85000, type: "full", date: "2026-04-04T08:55:00", reference: "NMB-2604040095", senderBank: "Wema Bank", senderAccountName: "Fatima Sule" },
  { id: "p-0020", tenantId: "t-005", amount: 85000, type: "full", date: "2026-05-05T10:20:00", reference: "NMB-2605050095", senderBank: "Wema Bank", senderAccountName: "Fatima Sule" },
  { id: "p-0021", tenantId: "t-005", amount: 85000, type: "full", date: "2026-06-04T09:10:00", reference: "NMB-2606040095", senderBank: "Wema Bank", senderAccountName: "Fatima Sule" },

  // Ibrahim Musa — t-006 — OVERPAID this cycle
  { id: "p-0022", tenantId: "t-006", amount: 85000, type: "full", date: "2026-04-01T14:30:00", reference: "NMB-2604010096", senderBank: "Sterling Bank", senderAccountName: "Ibrahim Musa" },
  { id: "p-0023", tenantId: "t-006", amount: 85000, type: "full", date: "2026-05-01T15:12:00", reference: "NMB-2605010096", senderBank: "Sterling Bank", senderAccountName: "Ibrahim Musa" },
  { id: "p-0024", tenantId: "t-006", amount: 85000, type: "full", date: "2026-06-01T13:45:00", reference: "NMB-2606010096", senderBank: "Sterling Bank", senderAccountName: "Ibrahim Musa" },
  { id: "p-0025", tenantId: "t-006", amount: 100000, type: "overpayment", date: "2026-07-02T09:35:00", reference: "NMB-2607020096", senderBank: "Sterling Bank", senderAccountName: "Ibrahim Musa" },

  // Blessing Okonkwo — t-007 — DISPUTED this cycle (sender name mismatch)
  { id: "p-0026", tenantId: "t-007", amount: 85000, type: "full", date: "2026-04-07T11:00:00", reference: "NMB-2604070097", senderBank: "Wema Bank", senderAccountName: "Blessing Okonkwo" },
  { id: "p-0027", tenantId: "t-007", amount: 85000, type: "full", date: "2026-05-06T12:40:00", reference: "NMB-2605060097", senderBank: "Wema Bank", senderAccountName: "Blessing Okonkwo" },
  { id: "p-0028", tenantId: "t-007", amount: 85000, type: "full", date: "2026-06-07T10:55:00", reference: "NMB-2606070097", senderBank: "Wema Bank", senderAccountName: "Blessing Okonkwo" },
  { id: "p-0029", tenantId: "t-007", amount: 85000, type: "disputed", date: "2026-07-02T18:05:00", reference: "NMB-2607020097", senderBank: "Wema Bank", senderAccountName: "Kelechi Nwosu" },

  // Segun Adebayo — t-008 — CLOSED, no payments since move-out
  { id: "p-0030", tenantId: "t-008", amount: 85000, type: "full", date: "2026-02-03T09:20:00", reference: "NMB-2602030098", senderBank: "Sterling Bank", senderAccountName: "Segun Adebayo" },
  { id: "p-0031", tenantId: "t-008", amount: 85000, type: "full", date: "2026-03-04T10:15:00", reference: "NMB-2603040098", senderBank: "Sterling Bank", senderAccountName: "Segun Adebayo" },
  { id: "p-0032", tenantId: "t-008", amount: 85000, type: "full", date: "2026-04-02T08:30:00", reference: "NMB-2604020098", senderBank: "Sterling Bank", senderAccountName: "Segun Adebayo" },
  { id: "p-0033", tenantId: "t-008", amount: 42000, type: "partial", date: "2026-05-10T14:00:00", reference: "NMB-2605100098", senderBank: "Sterling Bank", senderAccountName: "Segun Adebayo" },

  // Misdirected — no matching tenant account
  { id: "p-0034", tenantId: null, amount: 45000, type: "misdirected", date: "2026-06-20T16:50:00", reference: "NMB-2606200099", senderBank: "Access Bank", senderAccountName: "Kunle Adisa" },
];
