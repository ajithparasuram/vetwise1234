/**
 * VetWise Shop — types, demo products, demo orders, and cart helpers.
 * Frontend-first: the discount calculation here is a placeholder that
 * the backend will eventually own.
 */

export const SHOP_ANIMALS = [
  'Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Reptile', 'Small Animal',
  'Horse', 'Cattle', 'Goat', 'Sheep', 'Poultry', 'Livestock', 'Other',
];

export const SHOP_CATEGORIES = [
  'Medicines',
  'Pet Food & Animal Food',
  'Supplements',
  'Vitamins & Nutrition',
  'Grooming',
  'Healthcare',
  'Preventive Care',
  'Accessories / Supplies',
];

export interface ShopProduct {
  productId: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  subcategory: string;
  animalSpecies: string[];
  description: string;
  benefits: string;
  composition: string;
  usage: string;
  dosage: string;
  packSize: string;
  unit: string;
  mrp: number;
  sellingPrice: number;
  subscriberDiscountEligible: boolean;
  stockQty: number;
  prescriptionRequired: boolean;
  manufacturer: string;
  ageLifeStage: string;
  weightRange: string;
  storageInstructions: string;
  status: 'Active' | 'Inactive';
  demo: boolean;
  imageUrl?: string;
}

export interface ShopOrderItem {
  productId: string;
  name: string;
  sku: string;
  animal: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  subscriberDiscount: number;
  lineTotal: number;
  prescriptionRequired: boolean;
}

export type OrderStatus =
  | 'Pending' | 'Confirmed' | 'Processing' | 'Packed'
  | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled'
  | 'Payment Pending' | 'Payment Failed' | 'Payment Refunded';

export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';

export interface ShopOrder {
  orderId: string;
  clientId: string;
  customerName: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  city: string;
  state: string;
  pincode: string;
  items: ShopOrderItem[];
  itemCount: number;
  subtotal: number;
  subscriberDiscount: number;
  shipping: number;
  tax: number;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  paymentMethod: string;
  prescriptionRequired: boolean;
  prescriptionUploaded: boolean;
  prescriptionStatus: 'Not Required' | 'Pending Verification' | 'Verified' | 'Rejected';
  orderStatus: OrderStatus;
  orderDate: string;
  updatedAt: string;
  isSubscriber: boolean;
  timeline: { status: string; date: string; done: boolean }[];
  demo: boolean;
}

export const SUBSCRIBER_DISCOUNT_RATE = 0.10;

export function formatINRHelper(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

export { formatINRHelper as formatINR };

export function getSubscriberPrice(product: ShopProduct): number {
  if (!product.subscriberDiscountEligible) return product.sellingPrice;
  return Math.round(product.sellingPrice * (1 - SUBSCRIBER_DISCOUNT_RATE));
}

export function getStockStatus(qty: number): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= 10) return 'Low Stock';
  return 'In Stock';
}

export const demoProducts: ShopProduct[] = [
  {
    productId: 'VW-PROD-001', name: 'VetCalm Anti-Anxiety Chews', sku: 'VC-ANX-100',
    brand: 'VetCare', category: 'Medicines', subcategory: 'Behavioral',
    animalSpecies: ['Dog', 'Cat'],
    description: 'Calming chews for anxiety during travel, fireworks, or separation.',
    benefits: 'Reduces anxiety and stress without sedation.',
    composition: 'L-theanine 100mg, Magnesium 50mg, Chamomile extract 20mg',
    usage: 'Give 30 minutes before stressful events.',
    dosage: '1 chew per 10kg body weight',
    packSize: '30', unit: 'chews',
    mrp: 850, sellingPrice: 850, subscriberDiscountEligible: true,
    stockQty: 45, prescriptionRequired: false,
    manufacturer: 'VetCare Pharma', ageLifeStage: 'Adult', weightRange: 'All sizes',
    storageInstructions: 'Store in cool dry place',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/13779105/pexels-photo-13779105.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-002', name: 'Royal Canin Adult Dog Food', sku: 'RC-ADF-15',
    brand: 'Royal Canin', category: 'Pet Food & Animal Food', subcategory: 'Dry Food',
    animalSpecies: ['Dog'],
    description: 'Complete balanced nutrition for adult dogs of all breeds.',
    benefits: 'Supports immune system, healthy skin and coat.',
    composition: 'Dehydrated poultry protein, rice, vegetable protein, animal fats',
    usage: 'Feed as per weight chart on pack.',
    dosage: 'See feeding guide',
    packSize: '15', unit: 'kg',
    mrp: 4200, sellingPrice: 3950, subscriberDiscountEligible: true,
    stockQty: 28, prescriptionRequired: false,
    manufacturer: 'Royal Canin', ageLifeStage: 'Adult', weightRange: 'All sizes',
    storageInstructions: 'Store in airtight container',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/179221/pexels-photo-179221.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-003', name: 'Whiskas Adult Cat Food Ocean Fish', sku: 'WK-ACF-7',
    brand: 'Whiskas', category: 'Pet Food & Animal Food', subcategory: 'Dry Food',
    animalSpecies: ['Cat'],
    description: 'Nutritious dry cat food with ocean fish flavour.',
    benefits: 'Complete nutrition with taurine for eye and heart health.',
    composition: 'Poultry meal, corn, rice, fish meal, vegetable oil',
    usage: 'Feed 50-70g per day based on weight.',
    dosage: 'See pack guide',
    packSize: '7', unit: 'kg',
    mrp: 2100, sellingPrice: 1950, subscriberDiscountEligible: true,
    stockQty: 35, prescriptionRequired: false,
    manufacturer: 'Mars Petcare', ageLifeStage: 'Adult', weightRange: 'All sizes',
    storageInstructions: 'Store in cool dry place',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/13788415/pexels-photo-13788415.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-004', name: 'CattleMin Mineral Mixture', sku: 'CT-MIN-5',
    brand: 'AgriVet', category: 'Supplements', subcategory: 'Mineral Supplement',
    animalSpecies: ['Cattle', 'Goat', 'Sheep'],
    description: 'Essential mineral mixture for livestock health and productivity.',
    benefits: 'Improves milk yield, fertility, and bone strength.',
    composition: 'Calcium 25%, Phosphorus 12%, Zinc, Copper, Cobalt, Iodine',
    usage: 'Mix with feed daily.',
    dosage: '50g per animal per day',
    packSize: '5', unit: 'kg',
    mrp: 650, sellingPrice: 580, subscriberDiscountEligible: true,
    stockQty: 60, prescriptionRequired: false,
    manufacturer: 'AgriVet Industries', ageLifeStage: 'All', weightRange: 'All',
    storageInstructions: 'Keep dry',
    status: 'Active', demo: true,
  },
  {
    productId: 'VW-PROD-005', name: 'EquiPower Joint Supplement', sku: 'EQ-JNT-1',
    brand: 'EquiHealth', category: 'Supplements', subcategory: 'Joint Care',
    animalSpecies: ['Horse'],
    description: 'Joint and mobility supplement for horses.',
    benefits: 'Supports joint flexibility and reduces inflammation.',
    composition: 'Glucosamine 5000mg, Chondroitin 2000mg, MSM 1000mg',
    usage: 'Mix with grain feed.',
    dosage: '30g per day for adult horse',
    packSize: '1', unit: 'kg',
    mrp: 1800, sellingPrice: 1650, subscriberDiscountEligible: true,
    stockQty: 8, prescriptionRequired: false,
    manufacturer: 'EquiHealth Labs', ageLifeStage: 'Adult', weightRange: 'All',
    storageInstructions: 'Store in cool dry place',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/18784702/pexels-photo-18784702.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-006', name: 'Amoxicillin 250mg Tablets', sku: 'AMX-250-100',
    brand: 'VetMed', category: 'Medicines', subcategory: 'Antibiotic',
    animalSpecies: ['Dog', 'Cat', 'Rabbit'],
    description: 'Broad-spectrum antibiotic for bacterial infections.',
    benefits: 'Treats respiratory, urinary, and skin infections.',
    composition: 'Amoxicillin trihydrate 250mg',
    usage: 'As directed by veterinarian.',
    dosage: '10-20mg per kg body weight, twice daily',
    packSize: '100', unit: 'tablets',
    mrp: 350, sellingPrice: 320, subscriberDiscountEligible: true,
    stockQty: 120, prescriptionRequired: true,
    manufacturer: 'VetMed Pharma', ageLifeStage: 'All', weightRange: 'All',
    storageInstructions: 'Store below 25°C',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/13779109/pexels-photo-13779109.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-007', name: 'PetVit Multivitamin Syrup', sku: 'PV-MVT-200',
    brand: 'PetHealth', category: 'Vitamins & Nutrition', subcategory: 'Multivitamin',
    animalSpecies: ['Dog', 'Cat'],
    description: 'Daily multivitamin syrup for overall health and vitality.',
    benefits: 'Boosts immunity, supports growth, improves appetite.',
    composition: 'Vitamin A, B-complex, C, D3, E, essential amino acids',
    usage: 'Can be given directly or mixed with food.',
    dosage: '1ml per 2kg body weight daily',
    packSize: '200', unit: 'ml',
    mrp: 450, sellingPrice: 420, subscriberDiscountEligible: true,
    stockQty: 55, prescriptionRequired: false,
    manufacturer: 'PetHealth Labs', ageLifeStage: 'All', weightRange: 'All',
    storageInstructions: 'Refrigerate after opening',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/13779110/pexels-photo-13779110.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-008', name: 'AquaCare Fish Food Flakes', sku: 'AC-FF-250',
    brand: 'AquaPure', category: 'Pet Food & Animal Food', subcategory: 'Aquatic Food',
    animalSpecies: ['Fish'],
    description: 'Premium flake food for tropical and freshwater fish.',
    benefits: 'Enhances colour, supports immune system.',
    composition: 'Fish meal, shrimp meal, spirulina, yeast, vitamins',
    usage: 'Feed 2-3 times daily, only what fish consume in 2 minutes.',
    dosage: 'Pinch per feeding',
    packSize: '250', unit: 'g',
    mrp: 320, sellingPrice: 290, subscriberDiscountEligible: false,
    stockQty: 40, prescriptionRequired: false,
    manufacturer: 'AquaPure', ageLifeStage: 'All', weightRange: 'N/A',
    storageInstructions: 'Keep container sealed',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/18435512/pexels-photo-18435512.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-009', name: 'BunnyBoost Rabbit Pellets', sku: 'BB-RP-2',
    brand: 'SmallPet', category: 'Pet Food & Animal Food', subcategory: 'Small Animal Food',
    animalSpecies: ['Rabbit', 'Small Animal'],
    description: 'High-fiber pellet food for rabbits and small animals.',
    benefits: 'Supports digestive health and dental wear.',
    composition: 'Timothy hay, alfalfa, oats, vegetable fiber',
    usage: 'Provide unlimited access with fresh hay.',
    dosage: '1/4 cup per 2kg body weight daily',
    packSize: '2', unit: 'kg',
    mrp: 480, sellingPrice: 440, subscriberDiscountEligible: true,
    stockQty: 22, prescriptionRequired: false,
    manufacturer: 'SmallPet Nutrition', ageLifeStage: 'All', weightRange: 'All',
    storageInstructions: 'Store in cool dry place',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/19904640/pexels-photo-19904640.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-010', name: 'GroomPro Anti-Tick Shampoo', sku: 'GP-ATS-500',
    brand: 'GroomPro', category: 'Grooming', subcategory: 'Shampoo',
    animalSpecies: ['Dog', 'Cat', 'Horse'],
    description: 'Medicated shampoo for tick and flea control.',
    benefits: 'Kills ticks and fleas, soothes skin irritation.',
    composition: 'Propoxur 0.1%, conditioning agents',
    usage: 'Wet coat, lather, leave 5 minutes, rinse thoroughly.',
    dosage: 'As needed, not more than once weekly',
    packSize: '500', unit: 'ml',
    mrp: 380, sellingPrice: 350, subscriberDiscountEligible: false,
    stockQty: 0, prescriptionRequired: false,
    manufacturer: 'GroomPro', ageLifeStage: 'All', weightRange: 'All',
    storageInstructions: 'Store at room temperature',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/31955999/pexels-photo-31955999.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-011', name: 'PoultryBoost Vitamin Supplement', sku: 'PB-VS-1',
    brand: 'AgriVet', category: 'Vitamins & Nutrition', subcategory: 'Poultry Supplement',
    animalSpecies: ['Poultry'],
    description: 'Water-soluble vitamin supplement for poultry health.',
    benefits: 'Improves egg production, immunity, and growth rate.',
    composition: 'Vitamin A, D3, E, K, B-complex, Vitamin C',
    usage: 'Dissolve in drinking water.',
    dosage: '1g per litre of drinking water for 5 days',
    packSize: '1', unit: 'kg',
    mrp: 550, sellingPrice: 500, subscriberDiscountEligible: true,
    stockQty: 75, prescriptionRequired: false,
    manufacturer: 'AgriVet Industries', ageLifeStage: 'All', weightRange: 'N/A',
    storageInstructions: 'Keep dry and sealed',
    status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/39426780/pexels-photo-39426780.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-012', name: 'GoatDeworm Oral Suspension', sku: 'GD-DW-100',
    brand: 'VetMed', category: 'Preventive Care', subcategory: 'Deworming',
    animalSpecies: ['Goat', 'Sheep', 'Cattle'],
    description: 'Broad-spectrum dewormer for goats, sheep, and cattle.',
    benefits: 'Controls roundworms, lungworms, and tapeworms.',
    composition: 'Fenbendazole 2.5%',
    usage: 'Administer orally.',
    dosage: '1ml per 4kg body weight',
    packSize: '100', unit: 'ml',
    mrp: 280, sellingPrice: 260, subscriberDiscountEligible: true,
    stockQty: 50, prescriptionRequired: true,
    manufacturer: 'VetMed Pharma', ageLifeStage: 'All', weightRange: 'All',
    storageInstructions: 'Store below 30°C',
    status: 'Active', demo: true,
  },
  {
    productId: 'VW-PROD-013', name: 'BirdVite Calcium Block', sku: 'BV-CB-100',
    brand: 'BirdCare', category: 'Supplements', subcategory: 'Calcium',
    animalSpecies: ['Bird'],
    description: 'Calcium and mineral block for caged and aviary birds.',
    benefits: 'Strengthens bones and eggshells, supports beak health.',
    composition: 'Calcium carbonate 95%, trace minerals',
    usage: 'Place in cage for birds to peck as needed.',
    dosage: 'Free access',
    packSize: '100', unit: 'g',
    mrp: 150, sellingPrice: 130, subscriberDiscountEligible: false,
    stockQty: 100, prescriptionRequired: false,
    manufacturer: 'BirdCare Products', ageLifeStage: 'All', weightRange: 'N/A',
    storageInstructions: 'Keep dry', status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/32212619/pexels-photo-32212619.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-014', name: 'VetWrap Bandage Roll', sku: 'VW-BR-10',
    brand: 'VetSupply', category: 'Healthcare', subcategory: 'First Aid',
    animalSpecies: ['Dog', 'Cat', 'Horse', 'Cattle', 'Goat', 'Sheep', 'Other'],
    description: 'Self-adhesive veterinary wrap for wounds and support.',
    benefits: 'Provides support without sticking to skin or fur.',
    composition: 'Non-woven synthetic material',
    usage: 'Wrap firmly, not too tight.',
    dosage: 'N/A',
    packSize: '10', unit: 'cm x 4.5m',
    mrp: 120, sellingPrice: 95, subscriberDiscountEligible: false,
    stockQty: 200, prescriptionRequired: false,
    manufacturer: 'VetSupply Co', ageLifeStage: 'All', weightRange: 'N/A',
    storageInstructions: 'Keep dry', status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/5098968/pexels-photo-5098968.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-015', name: 'Thermometer Digital Veterinary', sku: 'TH-DV-01',
    brand: 'VetSupply', category: 'Accessories / Supplies', subcategory: 'Diagnostic Tools',
    animalSpecies: ['Dog', 'Cat', 'Horse', 'Cattle', 'Goat', 'Sheep', 'Other'],
    description: 'Fast-reading digital thermometer for animal use.',
    benefits: 'Accurate temperature reading in 30 seconds.',
    composition: 'Digital probe with LCD display',
    usage: 'Insert rectally for 30 seconds.',
    dosage: 'N/A',
    packSize: '1', unit: 'piece',
    mrp: 250, sellingPrice: 220, subscriberDiscountEligible: false,
    stockQty: 30, prescriptionRequired: false,
    manufacturer: 'VetSupply Co', ageLifeStage: 'All', weightRange: 'N/A',
    storageInstructions: 'Keep clean and dry', status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/13161251/pexels-photo-13161251.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
  {
    productId: 'VW-PROD-016', name: 'Rabies Vaccine Vial', sku: 'RV-RV-10',
    brand: 'VetCare', category: 'Preventive Care', subcategory: 'Vaccine',
    animalSpecies: ['Dog', 'Cat', 'Cattle', 'Horse', 'Goat', 'Sheep'],
    description: 'Inactivated rabies vaccine for animals.',
    benefits: 'Provides immunity against rabies for 1-3 years.',
    composition: 'Inactivated rabies virus antigen',
    usage: 'Administer by veterinarian only.',
    dosage: '1ml subcutaneous, as per species protocol',
    packSize: '10', unit: 'doses',
    mrp: 1200, sellingPrice: 1100, subscriberDiscountEligible: true,
    stockQty: 5, prescriptionRequired: true,
    manufacturer: 'VetCare Pharma', ageLifeStage: 'All', weightRange: 'N/A',
    storageInstructions: 'Store at 2-8°C', status: 'Active', demo: true,
    imageUrl: 'https://images.pexels.com/photos/13779102/pexels-photo-13779102.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
  },
];

export const demoOrders: ShopOrder[] = [
  {
    orderId: 'VW-DEMO-1001',
    clientId: 'VW-CL-000001',
    customerName: 'Priya Sharma',
    phone: '+91 9876543210',
    email: 'priya@demo.com',
    deliveryAddress: '12 MG Road, Bandra West',
    city: 'Mumbai', state: 'Maharashtra', pincode: '400050',
    items: [
      { productId: 'VW-PROD-002', name: 'Royal Canin Adult Dog Food', sku: 'RC-ADF-15', animal: 'Dog', quantity: 1, mrp: 4200, sellingPrice: 3950, subscriberDiscount: 395, lineTotal: 3555, prescriptionRequired: false },
      { productId: 'VW-PROD-006', name: 'Amoxicillin 250mg Tablets', sku: 'AMX-250-100', animal: 'Dog', quantity: 1, mrp: 350, sellingPrice: 320, subscriberDiscount: 32, lineTotal: 288, prescriptionRequired: true },
    ],
    itemCount: 2,
    subtotal: 4270,
    subscriberDiscount: 427,
    shipping: 0,
    tax: 0,
    finalAmount: 3843,
    paymentStatus: 'Paid',
    paymentReference: 'rzp_demo_001',
    paymentMethod: 'UPI',
    prescriptionRequired: true,
    prescriptionUploaded: true,
    prescriptionStatus: 'Verified',
    orderStatus: 'Processing',
    orderDate: '02 Oct 2026, 2:30 PM',
    updatedAt: '03 Oct 2026, 9:00 AM',
    isSubscriber: true,
    timeline: [
      { status: 'Order Placed', date: '02 Oct 2026, 2:30 PM', done: true },
      { status: 'Payment Confirmed', date: '02 Oct 2026, 2:31 PM', done: true },
      { status: 'Processing', date: '03 Oct 2026, 9:00 AM', done: true },
      { status: 'Packed', date: '', done: false },
      { status: 'Shipped', date: '', done: false },
      { status: 'Out for Delivery', date: '', done: false },
      { status: 'Delivered', date: '', done: false },
    ],
    demo: true,
  },
  {
    orderId: 'VW-DEMO-1002',
    clientId: 'VW-CL-000002',
    customerName: 'Ramesh Patel',
    phone: '+91 9812345678',
    email: 'ramesh@demo.com',
    deliveryAddress: '45 Ring Road',
    city: 'New Delhi', state: 'Delhi', pincode: '110001',
    items: [
      { productId: 'VW-PROD-004', name: 'CattleMin Mineral Mixture', sku: 'CT-MIN-5', animal: 'Cattle', quantity: 2, mrp: 1300, sellingPrice: 1160, subscriberDiscount: 116, lineTotal: 2088, prescriptionRequired: false },
    ],
    itemCount: 1,
    subtotal: 1160,
    subscriberDiscount: 116,
    shipping: 50,
    tax: 0,
    finalAmount: 1094,
    paymentStatus: 'Paid',
    paymentReference: 'rzp_demo_002',
    paymentMethod: 'Card',
    prescriptionRequired: false,
    prescriptionUploaded: false,
    prescriptionStatus: 'Not Required',
    orderStatus: 'Shipped',
    orderDate: '01 Oct 2026, 11:00 AM',
    updatedAt: '02 Oct 2026, 4:00 PM',
    isSubscriber: true,
    timeline: [
      { status: 'Order Placed', date: '01 Oct 2026, 11:00 AM', done: true },
      { status: 'Payment Confirmed', date: '01 Oct 2026, 11:01 AM', done: true },
      { status: 'Processing', date: '01 Oct 2026, 2:00 PM', done: true },
      { status: 'Packed', date: '01 Oct 2026, 5:00 PM', done: true },
      { status: 'Shipped', date: '02 Oct 2026, 4:00 PM', done: true },
      { status: 'Out for Delivery', date: '', done: false },
      { status: 'Delivered', date: '', done: false },
    ],
    demo: true,
  },
  {
    orderId: 'VW-DEMO-1003',
    clientId: 'VW-CL-000003',
    customerName: 'Suresh Kumar',
    phone: '+91 9800011122',
    email: 'suresh@demo.com',
    deliveryAddress: '8 Brigade Road',
    city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
    items: [
      { productId: 'VW-PROD-005', name: 'EquiPower Joint Supplement', sku: 'EQ-JNT-1', animal: 'Horse', quantity: 1, mrp: 1800, sellingPrice: 1650, subscriberDiscount: 165, lineTotal: 1485, prescriptionRequired: false },
      { productId: 'VW-PROD-007', name: 'PetVit Multivitamin Syrup', sku: 'PV-MVT-200', animal: 'Dog', quantity: 2, mrp: 900, sellingPrice: 840, subscriberDiscount: 84, lineTotal: 1512, prescriptionRequired: false },
    ],
    itemCount: 2,
    subtotal: 2490,
    subscriberDiscount: 249,
    shipping: 75,
    tax: 0,
    finalAmount: 2316,
    paymentStatus: 'Paid',
    paymentReference: 'rzp_demo_003',
    paymentMethod: 'Net Banking',
    prescriptionRequired: false,
    prescriptionUploaded: false,
    prescriptionStatus: 'Not Required',
    orderStatus: 'Delivered',
    orderDate: '28 Sept 2026, 3:00 PM',
    updatedAt: '01 Oct 2026, 12:00 PM',
    isSubscriber: true,
    timeline: [
      { status: 'Order Placed', date: '28 Sept 2026, 3:00 PM', done: true },
      { status: 'Payment Confirmed', date: '28 Sept 2026, 3:01 PM', done: true },
      { status: 'Processing', date: '28 Sept 2026, 5:00 PM', done: true },
      { status: 'Packed', date: '29 Sept 2026, 10:00 AM', done: true },
      { status: 'Shipped', date: '29 Sept 2026, 6:00 PM', done: true },
      { status: 'Out for Delivery', date: '01 Oct 2026, 9:00 AM', done: true },
      { status: 'Delivered', date: '01 Oct 2026, 12:00 PM', done: true },
    ],
    demo: true,
  },
  {
    orderId: 'VW-DEMO-1004',
    clientId: 'VW-CL-000004',
    customerName: 'Anita Desai',
    phone: '+91 9844556677',
    email: 'anita@demo.com',
    deliveryAddress: '23 FC Road',
    city: 'Pune', state: 'Maharashtra', pincode: '411005',
    items: [
      { productId: 'VW-PROD-009', name: 'BunnyBoost Rabbit Pellets', sku: 'BB-RP-2', animal: 'Rabbit', quantity: 1, mrp: 480, sellingPrice: 440, subscriberDiscount: 0, lineTotal: 440, prescriptionRequired: false },
    ],
    itemCount: 1,
    subtotal: 440,
    subscriberDiscount: 0,
    shipping: 40,
    tax: 0,
    finalAmount: 480,
    paymentStatus: 'Pending',
    paymentReference: '',
    paymentMethod: 'Pending',
    prescriptionRequired: false,
    prescriptionUploaded: false,
    prescriptionStatus: 'Not Required',
    orderStatus: 'Payment Pending',
    orderDate: '03 Oct 2026, 10:00 AM',
    updatedAt: '03 Oct 2026, 10:00 AM',
    isSubscriber: false,
    timeline: [
      { status: 'Order Placed', date: '03 Oct 2026, 10:00 AM', done: true },
      { status: 'Payment Confirmed', date: '', done: false },
      { status: 'Processing', date: '', done: false },
      { status: 'Packed', date: '', done: false },
      { status: 'Shipped', date: '', done: false },
      { status: 'Out for Delivery', date: '', done: false },
      { status: 'Delivered', date: '', done: false },
    ],
    demo: true,
  },
  {
    orderId: 'VW-DEMO-1005',
    clientId: 'VW-CL-000005',
    customerName: 'Vikram Singh',
    phone: '+91 9899887766',
    email: 'vikram@demo.com',
    deliveryAddress: '17 MI Road',
    city: 'Jaipur', state: 'Rajasthan', pincode: '302001',
    items: [
      { productId: 'VW-PROD-008', name: 'AquaCare Fish Food Flakes', sku: 'AC-FF-250', animal: 'Fish', quantity: 2, mrp: 640, sellingPrice: 580, subscriberDiscount: 0, lineTotal: 580, prescriptionRequired: false },
    ],
    itemCount: 1,
    subtotal: 580,
    subscriberDiscount: 0,
    shipping: 30,
    tax: 0,
    finalAmount: 610,
    paymentStatus: 'Failed',
    paymentReference: 'rzp_demo_fail_005',
    paymentMethod: 'UPI',
    prescriptionRequired: false,
    prescriptionUploaded: false,
    prescriptionStatus: 'Not Required',
    orderStatus: 'Cancelled',
    orderDate: '02 Oct 2026, 7:00 PM',
    updatedAt: '02 Oct 2026, 7:05 PM',
    isSubscriber: false,
    timeline: [
      { status: 'Order Placed', date: '02 Oct 2026, 7:00 PM', done: true },
      { status: 'Payment Failed', date: '02 Oct 2026, 7:01 PM', done: true },
      { status: 'Cancelled', date: '02 Oct 2026, 7:05 PM', done: true },
    ],
    demo: true,
  },
];
