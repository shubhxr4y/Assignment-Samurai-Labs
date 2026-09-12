/**
 * Seed data for a fictional electrical & hardware supplier in Howrah, West
 * Bengal — the kind of business EzzyBooks is built for. Amounts are realistic
 * for the trade, and the mix of payment statuses is deliberate so the
 * dashboard and the pending-payments report have something to say.
 *
 * This file is data only. src/db/seed.ts prices it using the same money
 * helpers the API uses, so seeded invoices are arithmetically identical to
 * invoices raised through the UI.
 */

export interface SeedCustomer {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  status: 'active' | 'inactive';
}

export interface SeedItem {
  key: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: string;
  tax_rate: string;
  status: 'active' | 'inactive';
}

export interface SeedInvoice {
  invoice_number: string;
  customer: string;
  invoice_date: string;
  notes: string | null;
  /** 'full' | 'none' | a decimal string of rupees received so far. */
  paid: 'full' | 'none' | string;
  lines: Array<{ item: string; quantity: string }>;
}

export const customers: SeedCustomer[] = [
  {
    key: 'sharma',
    name: 'Sharma Traders',
    email: 'accounts@sharmatraders.in',
    phone: '+91 98300 41125',
    address: '14/2 Burrabazar, Kolkata, West Bengal 700007',
    gstin: '19AABCS1429B1Z8',
    status: 'active',
  },
  {
    key: 'verma',
    name: 'Verma Hardware',
    email: 'verma.hardware@gmail.com',
    phone: '+91 98764 20918',
    address: 'Shop 7, Gill Road, Ludhiana, Punjab 141003',
    gstin: '03AAFCV2201K1ZP',
    status: 'active',
  },
  {
    key: 'patel',
    name: 'Patel & Sons',
    email: 'billing@patelandsons.co.in',
    phone: '+91 99250 77341',
    address: '221 Relief Road, Ahmedabad, Gujarat 380001',
    gstin: '24AAGCP9911M1ZR',
    status: 'active',
  },
  {
    key: 'iyer',
    name: 'Iyer Interiors',
    email: 'hello@iyerinteriors.com',
    phone: '+91 90030 55218',
    address: '5 Kasturi Rangan Road, Alwarpet, Chennai, Tamil Nadu 600018',
    gstin: '33AACFI4420Q1ZK',
    status: 'active',
  },
  {
    key: 'bose',
    name: 'Bose Construction',
    email: 'projects@boseconstruction.in',
    phone: '+91 98315 66402',
    address: '9 Foreshore Road, Shibpur, Howrah, West Bengal 711102',
    gstin: '19AAHCB8812N1ZQ',
    status: 'active',
  },
  {
    key: 'khanna',
    name: 'Khanna Electricals',
    email: 'khanna.electricals@outlook.com',
    phone: '+91 98110 32874',
    address: 'B-42 Bhagirath Palace, Chandni Chowk, Delhi 110006',
    gstin: '07AADCK5567L1ZV',
    status: 'active',
  },
  {
    key: 'reddy',
    name: 'Reddy Enterprises',
    email: 'accounts@reddyenterprises.in',
    phone: '+91 94900 18823',
    address: '12-2-417 Gudimalkapur, Hyderabad, Telangana 500028',
    gstin: '36AAECR3391H1ZT',
    status: 'active',
  },
  {
    key: 'mehta',
    name: 'Mehta Furnishings',
    email: 'mehta.furnishings@gmail.com',
    phone: '+91 98200 74519',
    address: '3rd Floor, Lamington Road, Mumbai, Maharashtra 400007',
    gstin: '27AAKFM1188C1ZJ',
    status: 'inactive',
  },
];

export const items: SeedItem[] = [
  { key: 'wire15',   name: 'Copper Wire 1.5 sq mm — 90 m coil', description: 'FR PVC insulated, ISI marked', unit: 'coil',     unit_price: '1899.00',  tax_rate: '18', status: 'active' },
  { key: 'wire25',   name: 'Copper Wire 2.5 sq mm — 90 m coil', description: 'FR PVC insulated, ISI marked', unit: 'coil',     unit_price: '3150.00',  tax_rate: '18', status: 'active' },
  { key: 'switch6',  name: 'Modular Switch 6 A',               description: 'One-way, white finish',        unit: 'piece',    unit_price: '145.00',   tax_rate: '18', status: 'active' },
  { key: 'socket16', name: 'Modular Socket 16 A',              description: '6/16 A combined socket',       unit: 'piece',    unit_price: '320.00',   tax_rate: '18', status: 'active' },
  { key: 'mcb32',    name: 'MCB 32 A Double Pole',             description: 'C-curve, 10 kA breaking',      unit: 'piece',    unit_price: '685.00',   tax_rate: '18', status: 'active' },
  { key: 'dbox8',    name: 'Distribution Box — 8 Way',         description: 'Double door, powder coated',   unit: 'piece',    unit_price: '2450.00',  tax_rate: '18', status: 'active' },
  { key: 'led18',    name: 'LED Panel Light 18 W',             description: 'Round, cool daylight',         unit: 'piece',    unit_price: '540.00',   tax_rate: '12', status: 'active' },
  { key: 'fan1200',  name: 'Ceiling Fan 1200 mm',              description: 'BEE 5-star, 50 W',             unit: 'piece',    unit_price: '2890.00',  tax_rate: '18', status: 'active' },
  { key: 'conduit',  name: 'PVC Conduit Pipe 25 mm — 3 m',     description: 'Heavy gauge, ISI',             unit: 'length',   unit_price: '118.00',   tax_rate: '18', status: 'active' },
  { key: 'jbox',     name: 'Junction Box 4 x 4',               description: 'GI, flush mount',              unit: 'piece',    unit_price: '95.00',    tax_rate: '18', status: 'active' },
  { key: 'cement',   name: 'Cement Bag 50 kg (OPC 53)',        description: 'Grade 53 ordinary portland',   unit: 'bag',      unit_price: '415.00',   tax_rate: '28', status: 'active' },
  { key: 'paint',    name: 'Interior Emulsion Paint — 20 L',   description: 'Washable, low VOC',            unit: 'bucket',   unit_price: '4250.00',  tax_rate: '18', status: 'active' },
  { key: 'pump',     name: 'Submersible Pump 1 HP',            description: 'Single phase, copper winding', unit: 'piece',    unit_price: '12500.00', tax_rate: '18', status: 'active' },
  { key: 'gloves',   name: 'Electrical Safety Gloves',         description: 'Class 0, tested to 1 kV',      unit: 'pair',     unit_price: '620.00',   tax_rate: '5',  status: 'active' },
  { key: 'wiring',   name: 'Wiring Labour — per point',        description: 'Concealed wiring, per point',  unit: 'point',    unit_price: '350.00',   tax_rate: '18', status: 'active' },
  { key: 'amc',      name: 'Annual Maintenance Contract',      description: 'Quarterly site visits, 1 year',unit: 'contract', unit_price: '24000.00', tax_rate: '18', status: 'active' },
  { key: 'halogen',  name: 'Halogen Lamp 500 W',               description: 'Discontinued — replaced by LED floodlight', unit: 'piece', unit_price: '380.00', tax_rate: '18', status: 'inactive' },
];

/**
 * 14 invoices across the current financial year. Dates are generated relative
 * to "today" in seed.ts so the dashboard's six-month trend is always populated,
 * whenever the seed happens to be run.
 */
export const invoices: SeedInvoice[] = [
  { invoice_number: '0001', customer: 'bose',   invoice_date: '-156', notes: 'Phase 1 — Shibpur site, tower A.',      paid: 'full',      lines: [{ item: 'wire25', quantity: '40' }, { item: 'conduit', quantity: '220' }, { item: 'dbox8', quantity: '6' }, { item: 'wiring', quantity: '180' }] },
  { invoice_number: '0002', customer: 'sharma', invoice_date: '-148', notes: null,                                     paid: 'full',      lines: [{ item: 'switch6', quantity: '300' }, { item: 'socket16', quantity: '150' }, { item: 'jbox', quantity: '200' }] },
  { invoice_number: '0003', customer: 'khanna', invoice_date: '-131', notes: 'Chandni Chowk godown restock.',          paid: '85000',     lines: [{ item: 'wire15', quantity: '60' }, { item: 'mcb32', quantity: '75' }, { item: 'led18', quantity: '120' }] },
  { invoice_number: '0004', customer: 'patel',  invoice_date: '-118', notes: null,                                     paid: 'full',      lines: [{ item: 'fan1200', quantity: '24' }, { item: 'led18', quantity: '60' }, { item: 'gloves', quantity: '12' }] },
  { invoice_number: '0005', customer: 'iyer',   invoice_date: '-104', notes: 'Alwarpet residence — fit-out.',          paid: 'none',      lines: [{ item: 'paint', quantity: '14' }, { item: 'led18', quantity: '45' }, { item: 'wiring', quantity: '60' }] },
  { invoice_number: '0006', customer: 'bose',   invoice_date: '-92',  notes: 'Phase 2 — Shibpur site, tower B.',       paid: '250000',    lines: [{ item: 'cement', quantity: '400' }, { item: 'wire25', quantity: '55' }, { item: 'pump', quantity: '4' }] },
  { invoice_number: '0007', customer: 'verma',  invoice_date: '-77',  notes: null,                                     paid: 'full',      lines: [{ item: 'mcb32', quantity: '40' }, { item: 'dbox8', quantity: '10' }, { item: 'switch6', quantity: '120' }] },
  { invoice_number: '0008', customer: 'reddy',  invoice_date: '-63',  notes: 'Gudimalkapur warehouse — electricals.',  paid: 'none',      lines: [{ item: 'wire15', quantity: '35' }, { item: 'conduit', quantity: '160' }, { item: 'jbox', quantity: '140' }, { item: 'wiring', quantity: '95' }] },
  { invoice_number: '0009', customer: 'sharma', invoice_date: '-51',  notes: null,                                     paid: '40000',     lines: [{ item: 'fan1200', quantity: '18' }, { item: 'led18', quantity: '90' }, { item: 'socket16', quantity: '70' }] },
  { invoice_number: '0010', customer: 'khanna', invoice_date: '-38',  notes: null,                                     paid: 'full',      lines: [{ item: 'amc', quantity: '1' }, { item: 'gloves', quantity: '8' }] },
  { invoice_number: '0011', customer: 'iyer',   invoice_date: '-27',  notes: 'Second floor — lighting only.',          paid: '18500',     lines: [{ item: 'led18', quantity: '110' }, { item: 'switch6', quantity: '85' }] },
  { invoice_number: '0012', customer: 'patel',  invoice_date: '-19',  notes: null,                                     paid: 'none',      lines: [{ item: 'cement', quantity: '260' }, { item: 'paint', quantity: '9' }] },
  { invoice_number: '0013', customer: 'bose',   invoice_date: '-9',   notes: 'Site supervision and sundries.',         paid: 'none',      lines: [{ item: 'wiring', quantity: '120' }, { item: 'jbox', quantity: '90' }, { item: 'gloves', quantity: '20' }] },
  { invoice_number: '0014', customer: 'reddy',  invoice_date: '-3',   notes: null,                                     paid: 'none',      lines: [{ item: 'pump', quantity: '6' }, { item: 'mcb32', quantity: '30' }, { item: 'wire25', quantity: '22' }] },
];
