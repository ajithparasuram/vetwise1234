/**
 * VetWise Shop — client-facing shop components: catalog, product detail,
 * cart, checkout, my orders, order detail.
 */

import { useState, useMemo } from 'react';
import {
  Search, X, ShoppingCart, Plus, Minus, Trash2, Check, ArrowUpRight,
  Pill, Package, Heart, Stethoscope, Shield, Clock, MapPin, Phone,
  CreditCard, AlertTriangle, Star, Filter,
} from 'lucide-react';
import {
  SHOP_ANIMALS, SHOP_CATEGORIES, demoProducts, demoOrders,
  getSubscriberPrice, getStockStatus,
  type ShopProduct, type ShopOrder, type ShopOrderItem,
} from '@/lib/shop-data';

export interface CartItem {
  product: ShopProduct;
  quantity: number;
}

interface ShopProps {
  isSubscriber: boolean;
  cart: CartItem[];
  setCart: (items: CartItem[]) => void;
  navigate: (page: string) => void;
  selectedPet: string | null;
  setSelectedPet: (pet: string | null) => void;
  myPets: { name: string; species: string; breed: string }[];
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function categoryIcon(cat: string) {
  if (cat === 'Medicines') return <Pill size={18} />;
  if (cat === 'Pet Food & Animal Food') return <Package size={18} />;
  if (cat === 'Supplements') return <Heart size={18} />;
  if (cat === 'Vitamins & Nutrition') return <Shield size={18} />;
  if (cat === 'Grooming') return <Star size={18} />;
  if (cat === 'Healthcare') return <Stethoscope size={18} />;
  if (cat === 'Preventive Care') return <Shield size={18} />;
  return <Package size={18} />;
}

export function ShopHome({ isSubscriber, navigate }: { isSubscriber: boolean; navigate: (p: string) => void }) {
  const categoryCards = SHOP_CATEGORIES.map((c) => ({ name: c, icon: categoryIcon(c) }));
  return (
    <div className="shop-home">
      <div style={{ background: '#fff8e6', border: '1px solid #f0d060', borderRadius: 8, padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#8a6500', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <AlertTriangle size={15} /> Shop products and orders are sample data — checkout is for demonstration only and no real payment is processed.
      </div>
      <section className="shop-hero">
        <div>
          <p className="eyebrow" style={{ color: '#4365a3' }}>VETWISE SHOP</p>
          <h2>Veterinary medicines, nutrition, supplements and healthcare products for pets and animals.</h2>
          <button className="primary" onClick={() => navigate('Shop Catalog')}>Shop Now <ArrowUpRight size={16} /></button>
        </div>
      </section>

      <section className="shop-subscriber-promo">
        <div className="promo-content">
          <span className="promo-badge">10% OFF</span>
          <div>
            <h3>VetWise Subscribers Save 10%</h3>
            <p>Active VetWise subscribers get 10% off eligible medicines, pet food and supplements.</p>
          </div>
        </div>
        <div className="promo-actions">
          <button className="primary" onClick={() => navigate('Shop Catalog')}>Shop Now <ArrowUpRight size={14} /></button>
          <button className="secondary" onClick={() => navigate('Subscription')}>View Subscription</button>
        </div>
      </section>

      <section className="shop-categories">
        <h3 className="shop-section-title">Shop by Category</h3>
        <div className="category-grid">
          {categoryCards.map((c) => (
            <button key={c.name} className="category-card" onClick={() => navigate('Shop Catalog')}>
              <div className="category-icon">{c.icon}</div>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="shop-about">
        <h3 className="shop-section-title">About VetWise</h3>
        <p>VetWise brings veterinary care, appointments, prescriptions, animal health records and veterinary products together in one platform.</p>
        <div className="about-cards">
          <div className="about-card"><Stethoscope size={22} /><strong>Veterinary Care</strong><small>Appointments and veterinary consultations.</small></div>
          <div className="about-card"><Package size={22} /><strong>Digital Animal Records</strong><small>Keep animal health information organized.</small></div>
          <div className="about-card"><Pill size={22} /><strong>Prescriptions</strong><small>Access veterinary prescriptions and treatment information.</small></div>
          <div className="about-card"><ShoppingCart size={22} /><strong>Veterinary Shop</strong><small>Buy medicines, food, supplements and animal healthcare products.</small></div>
          <div className="about-card"><Shield size={22} /><strong>Subscriber Benefits</strong><small>Active subscribers receive 10% off eligible Shop products.</small></div>
        </div>
      </section>
    </div>
  );
}

export function ShopCatalog({ isSubscriber, cart, setCart, myPets, selectedPet, setSelectedPet }: ShopProps) {
  const [query, setQuery] = useState('');
  const [animal, setAnimal] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [rxOnly, setRxOnly] = useState(false);
  const [subscriberOnly, setSubscriberOnly] = useState(false);
  const [sort, setSort] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);

  const brands = useMemo(() => [...new Set(demoProducts.map((p) => p.brand))].sort(), []);

  const filtered = useMemo(() => {
    let result = demoProducts.filter((p) => p.status === 'Active');
    if (query) {
      const q = query.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.composition.toLowerCase().includes(q) ||
        p.animalSpecies.some((a) => a.toLowerCase().includes(q)),
      );
    }
    if (animal) result = result.filter((p) => p.animalSpecies.includes(animal));
    if (category) result = result.filter((p) => p.category === category);
    if (brand) result = result.filter((p) => p.brand === brand);
    if (rxOnly) result = result.filter((p) => p.prescriptionRequired);
    if (subscriberOnly) result = result.filter((p) => p.subscriberDiscountEligible);
    if (selectedPet) {
      const pet = myPets.find((p) => p.name === selectedPet);
      if (pet) result = result.filter((p) => p.animalSpecies.includes(pet.species));
    }
    switch (sort) {
      case 'price-asc': result = [...result].sort((a, b) => a.sellingPrice - b.sellingPrice); break;
      case 'price-desc': result = [...result].sort((a, b) => b.sellingPrice - a.sellingPrice); break;
    }
    return result;
  }, [query, animal, category, brand, rxOnly, subscriberOnly, sort, selectedPet, myPets]);

  const addToCart = (product: ShopProduct) => {
    const existing = cart.find((c) => c.product.productId === product.productId);
    if (existing) {
      setCart(cart.map((c) => c.product.productId === product.productId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  return (
    <div className="shop-catalog">
      <div className="shop-toolbar">
        <div className="searchbar"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, brands, ingredients..." />{query && <button onClick={() => setQuery('')}><X size={14} /></button>}</div>
        <select className="species-filter" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="relevance">Relevance</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
        <button className={`secondary ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}><Filter size={15} /> Filters</button>
      </div>

      {myPets.length > 0 && (
        <div className="shop-pet-selector">
          <span>Shop for:</span>
          <button className={!selectedPet ? 'active' : ''} onClick={() => setSelectedPet(null)}>All Animals</button>
          {myPets.map((p) => (
            <button key={p.name} className={selectedPet === p.name ? 'active' : ''} onClick={() => setSelectedPet(p.name)}>{p.name} ({p.species})</button>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="shop-filters">
          <div className="filter-group">
            <label>Animal</label>
            <select value={animal} onChange={(e) => setAnimal(e.target.value)}><option value="">All Animals</option>{SHOP_ANIMALS.map((a) => <option key={a}>{a}</option>)}</select>
          </div>
          <div className="filter-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All Categories</option>{SHOP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="filter-group">
            <label>Brand</label>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">All Brands</option>{brands.map((b) => <option key={b}>{b}</option>)}</select>
          </div>
          <label className="filter-check"><input type="checkbox" checked={rxOnly} onChange={(e) => setRxOnly(e.target.checked)} /> Prescription Required</label>
          <label className="filter-check"><input type="checkbox" checked={subscriberOnly} onChange={(e) => setSubscriberOnly(e.target.checked)} /> Subscriber Eligible</label>
        </div>
      )}

      <div className="shop-results-meta"><small>{filtered.length} products found</small></div>

      <div className="product-grid">
        {filtered.map((p) => (
          <ProductCard key={p.productId} product={p} isSubscriber={isSubscriber} onAdd={() => addToCart(p)} />
        ))}
      </div>
      {filtered.length === 0 && <div className="empty-state"><Package size={36} /><h3>No products found</h3><p>Try a different search or filter.</p></div>}
    </div>
  );
}

function ProductCard({ product, isSubscriber, onAdd }: { product: ShopProduct; isSubscriber: boolean; onAdd: () => void }) {
  const stock = getStockStatus(product.stockQty);
  const subPrice = getSubscriberPrice(product);
  return (
    <div className="product-card">
      {product.demo && <span className="demo-tag">Demo Product</span>}
      {product.prescriptionRequired && <span className="rx-badge"><Pill size={10} /> Rx</span>}
      <div className="product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : <Package size={40} />}</div>
      <div className="product-info">
        <small className="product-brand">{product.brand}</small>
        <strong className="product-name">{product.name}</strong>
        <div className="product-animals">{product.animalSpecies.slice(0, 3).map((a) => <span key={a} className="animal-tag">{a}</span>)}</div>
        <div className="product-price">
          <span className="selling-price">{formatINR(product.sellingPrice)}</span>
          {product.mrp > product.sellingPrice && <span className="mrp-price">{formatINR(product.mrp)}</span>}
        </div>
        {product.subscriberDiscountEligible && (
          isSubscriber ? (
            <div className="sub-price-active"><small>Subscriber Price: {formatINR(subPrice)}</small><small className="save-badge">Save {formatINR(product.sellingPrice - subPrice)}</small></div>
          ) : (
            <div className="sub-price-hint"><Shield size={11} /> <small>Subscribe and save 10%</small></div>
          )
        )}
        <div className="product-meta">
          <small>{product.packSize} {product.unit}</small>
          <span className={`stock-badge stock-${stock.toLowerCase().replace(/ /g, '-')}`}>{stock}</span>
        </div>
      </div>
      <button className="primary add-cart-btn" onClick={onAdd} disabled={stock === 'Out of Stock'}>
        <ShoppingCart size={14} /> {stock === 'Out of Stock' ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  );
}

export function ProductDetail({ product, isSubscriber, onAdd, onBack }: { product: ShopProduct; isSubscriber: boolean; onAdd: () => void; onBack: () => void }) {
  const [qty, setQty] = useState(1);
  const stock = getStockStatus(product.stockQty);
  const subPrice = getSubscriberPrice(product);
  const related = demoProducts.filter((p) => p.category === product.category && p.productId !== product.productId).slice(0, 4);
  return (
    <div className="product-detail-page">
      <button className="secondary back-btn" onClick={onBack}>Back to Shop</button>
      <div className="product-detail-grid">
        <div className="product-detail-image">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <Package size={80} />}
          {product.demo && <span className="demo-tag">Demo Product</span>}
        </div>
        <div className="product-detail-info">
          <small className="product-brand">{product.brand}</small>
          <h2>{product.name}</h2>
          <div className="product-detail-animals">{product.animalSpecies.map((a) => <span key={a} className="animal-tag">{a}</span>)}</div>
          {product.prescriptionRequired && <div className="rx-notice"><Pill size={14} /> <span>Prescription Required</span></div>}
          <div className="product-detail-price">
            <div><label>MRP</label><strong>{formatINR(product.mrp)}</strong></div>
            <div><label>Selling Price</label><strong>{formatINR(product.sellingPrice)}</strong></div>
            {product.subscriberDiscountEligible && (
              isSubscriber ? (
                <>
                  <div className="sub-price-highlight"><label>Subscriber Price (10% Off)</label><strong>{formatINR(subPrice)}</strong></div>
                  <div className="save-highlight"><label>You Save</label><strong>{formatINR(product.sellingPrice - subPrice)}</strong></div>
                </>
              ) : (
                <div className="sub-price-cta">
                  <Shield size={14} />
                  <div><strong>Subscribe to VetWise and save 10% on eligible products.</strong><button className="link">View Subscription</button></div>
                </div>
              )
            )}
          </div>
          <div className="product-detail-stock">
            <span className={`stock-badge stock-${stock.toLowerCase().replace(/ /g, '-')}`}>{stock}</span>
            <small>{product.stockQty} units available</small>
          </div>
          <div className="product-qty-row">
            <div className="qty-selector">
              <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={14} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty(qty + 1)}><Plus size={14} /></button>
            </div>
            <button className="primary" onClick={() => { for (let i = 0; i < qty; i++) onAdd(); }} disabled={stock === 'Out of Stock'}><ShoppingCart size={15} /> Add to Cart</button>
            <button className="secondary" disabled={stock === 'Out of Stock'}>Buy Now</button>
          </div>
          {product.prescriptionRequired && (
            <div className="prescription-workflow">
              <h4><Pill size={15} /> Prescription Verification Required</h4>
              <p>This product requires a valid veterinary prescription. Please upload your prescription or select an existing one. Your order will be confirmed after prescription verification.</p>
              <div className="prescription-actions">
                <button className="secondary"><Plus size={14} /> Upload Prescription</button>
                <button className="secondary">Select Existing Prescription</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="product-detail-tabs">
        <div className="product-info-section"><h4>Description</h4><p>{product.description}</p></div>
        <div className="product-info-section"><h4>Benefits</h4><p>{product.benefits}</p></div>
        <div className="product-info-section"><h4>Composition / Ingredients</h4><p>{product.composition}</p></div>
        <div className="product-info-section"><h4>Usage Information</h4><p>{product.usage}</p></div>
        <div className="product-info-section"><h4>Dosage</h4><p>{product.dosage}</p></div>
        <div className="product-info-grid">
          <div><label>PACK SIZE</label><strong>{product.packSize} {product.unit}</strong></div>
          <div><label>MANUFACTURER</label><strong>{product.manufacturer}</strong></div>
          <div><label>CATEGORY</label><strong>{product.category}</strong></div>
          <div><label>SUBCATEGORY</label><strong>{product.subcategory}</strong></div>
          <div><label>AGE / LIFE STAGE</label><strong>{product.ageLifeStage}</strong></div>
          <div><label>WEIGHT RANGE</label><strong>{product.weightRange}</strong></div>
          <div className="wide"><label>STORAGE</label><strong>{(product as any).storageInstructions ?? (product as any).StorageInstructions ?? 'N/A'}</strong></div>
        </div>
      </div>
      {related.length > 0 && (
        <div className="related-products">
          <h4>Related Products</h4>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.productId} product={p} isSubscriber={isSubscriber} onAdd={() => onAdd()} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function Cart({ cart, setCart, isSubscriber, navigate }: { cart: CartItem[]; setCart: (c: CartItem[]) => void; isSubscriber: boolean; navigate: (p: string) => void }) {
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);

  if (selectedProduct) {
    return <ProductDetail product={selectedProduct} isSubscriber={isSubscriber} onAdd={() => {}} onBack={() => setSelectedProduct(null)} />;
  }

  if (cart.length === 0) {
    return <div className="empty-state"><ShoppingCart size={40} /><h3>Your cart is empty</h3><p>Browse the shop and add products to your cart.</p><button className="primary" onClick={() => navigate('Shop Catalog')}>Shop Now <ArrowUpRight size={14} /></button></div>;
  }

  const updateQty = (idx: number, delta: number) => {
    setCart(cart.map((c, i) => i === idx ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };
  const removeItem = (idx: number) => setCart(cart.filter((_, i) => i !== idx));

  let subtotal = 0;
  let subscriberDiscount = 0;
  cart.forEach((c) => {
    subtotal += c.product.sellingPrice * c.quantity;
    if (isSubscriber && c.product.subscriberDiscountEligible) {
      subscriberDiscount += Math.round(c.product.sellingPrice * 0.10 * c.quantity);
    }
  });
  const shipping = subtotal > 2000 ? 0 : 50;
  const tax = 0;
  const grandTotal = subtotal - subscriberDiscount + shipping + tax;

  return (
    <div className="cart-page">
      <div className="cart-items">
        {cart.map((c, i) => {
          const subPrice = getSubscriberPrice(c.product);
          const lineTotal = (isSubscriber && c.product.subscriberDiscountEligible ? subPrice : c.product.sellingPrice) * c.quantity;
          const lineDiscount = isSubscriber && c.product.subscriberDiscountEligible ? (c.product.sellingPrice - subPrice) * c.quantity : 0;
          return (
            <div className="cart-row" key={c.product.productId}>
              <div className="cart-product-icon">{c.product.imageUrl ? <img src={c.product.imageUrl} alt={c.product.name} /> : <Package size={24} />}</div>
              <div className="cart-product-info">
                <strong>{c.product.name}</strong>
                <small>{c.product.brand} · {c.product.packSize} {c.product.unit}</small>
                {c.product.prescriptionRequired && <span className="rx-badge"><Pill size={10} /> Rx</span>}
                {c.product.subscriberDiscountEligible && isSubscriber && <small className="sub-discount-line">10% Subscriber Discount applied</small>}
              </div>
              <div className="cart-qty">
                <button onClick={() => updateQty(i, -1)}><Minus size={14} /></button>
                <span>{c.quantity}</span>
                <button onClick={() => updateQty(i, 1)}><Plus size={14} /></button>
              </div>
              <div className="cart-prices">
                {c.product.mrp > c.product.sellingPrice && <small className="mrp-price">{formatINR(c.product.mrp * c.quantity)}</small>}
                <strong>{formatINR(c.product.sellingPrice * c.quantity)}</strong>
                {lineDiscount > 0 && <small className="sub-discount-line">Subscriber saves {formatINR(lineDiscount)}</small>}
              </div>
              <div className="cart-line-total">{formatINR(lineTotal)}</div>
              <button className="icon-btn" onClick={() => removeItem(i)}><Trash2 size={16} /></button>
            </div>
          );
        })}
      </div>
      <div className="cart-summary">
        <h3>Price Summary</h3>
        <div className="summary-row"><span>Subtotal</span><strong>{formatINR(subtotal)}</strong></div>
        {subscriberDiscount > 0 && <div className="summary-row discount"><span>Subscriber Discount (10%)</span><strong>-{formatINR(subscriberDiscount)}</strong></div>}
        <div className="summary-row"><span>Shipping</span><strong>{shipping === 0 ? 'Free' : formatINR(shipping)}</strong></div>
        <div className="summary-row"><span>Tax</span><strong>{tax === 0 ? 'Included' : formatINR(tax)}</strong></div>
        <div className="summary-row grand-total"><span>Grand Total</span><strong>{formatINR(grandTotal)}</strong></div>
        <button className="primary full" onClick={() => navigate('Checkout')}>Proceed to Checkout</button>
        <button className="secondary full" onClick={() => navigate('Shop Catalog')}>Continue Shopping</button>
      </div>
    </div>
  );
}

export function Checkout({ cart, isSubscriber, navigate, onOrderPlaced }: { cart: CartItem[]; isSubscriber: boolean; navigate: (p: string) => void; onOrderPlaced: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', pet: '' });
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [placed, setPlaced] = useState(false);

  if (cart.length === 0 && !placed) {
    return <div className="empty-state"><ShoppingCart size={40} /><h3>Cart is empty</h3><p>Add products before checkout.</p><button className="primary" onClick={() => navigate('Shop Catalog')}>Shop Now</button></div>;
  }

  let subtotal = 0, subscriberDiscount = 0;
  cart.forEach((c) => {
    subtotal += c.product.sellingPrice * c.quantity;
    if (isSubscriber && c.product.subscriberDiscountEligible) subscriberDiscount += Math.round(c.product.sellingPrice * 0.10 * c.quantity);
  });
  const shipping = subtotal > 2000 ? 0 : 50;
  const grandTotal = subtotal - subscriberDiscount + shipping;
  const hasRx = cart.some((c) => c.product.prescriptionRequired);

  if (placed) {
    return <div className="empty-state"><Check size={48} /><h3>Demo Checkout Complete</h3><p>This was a demo checkout — no order was placed or saved. Orders are not yet connected to a backend.</p><button className="primary" onClick={() => { onOrderPlaced(); navigate('My Orders'); }}>View Demo Orders</button></div>;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-form">
        <h3>Delivery Information</h3>
        <div className="form-grid">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /></label>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" /></label>
          <label>PIN Code<input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="6-digit PIN" /></label>
          <label className="wide">Address<textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full delivery address" /></label>
          <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" /></label>
          <label>State<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" /></label>
        </div>
        {hasRx && (
          <div className="prescription-workflow">
            <h4><Pill size={15} /> Prescription Required</h4>
            <p>Some items require a prescription. Please upload or select a prescription for verification.</p>
            <div className="prescription-actions">
              <button className="secondary"><Plus size={14} /> Upload Prescription</button>
              <button className="secondary">Select Existing</button>
            </div>
          </div>
        )}
        <h3 style={{ marginTop: '20px' }}>Payment Method</h3>
        <div className="payment-methods">
          {['UPI', 'Card', 'Net Banking', 'Cash on Delivery'].map((m) => (
            <button key={m} className={paymentMethod === m ? 'active' : ''} onClick={() => setPaymentMethod(m)}><CreditCard size={14} /> {m}</button>
          ))}
        </div>
      </div>
      <div className="cart-summary">
        <h3>Order Summary</h3>
        {cart.map((c) => (
          <div className="summary-item" key={c.product.productId}>
            <div><strong>{c.product.name}</strong><small>Qty: {c.quantity} · {formatINR(c.product.sellingPrice)}</small></div>
            <span>{formatINR(c.product.sellingPrice * c.quantity)}</span>
          </div>
        ))}
        <div className="summary-row"><span>Subtotal</span><strong>{formatINR(subtotal)}</strong></div>
        {subscriberDiscount > 0 && <div className="summary-row discount"><span>Subscriber Discount</span><strong>-{formatINR(subscriberDiscount)}</strong></div>}
        <div className="summary-row"><span>Shipping</span><strong>{shipping === 0 ? 'Free' : formatINR(shipping)}</strong></div>
        <div className="summary-row grand-total"><span>Total</span><strong>{formatINR(grandTotal)}</strong></div>
        <button className="primary full" onClick={() => setPlaced(true)}>Complete Demo Checkout</button>
        <p className="checkout-note" style={{ color: '#e8870a' }}><AlertTriangle size={12} /> Demo store — orders are not placed or saved. No real payment is processed.</p>
      </div>
    </div>
  );
}

export function MyOrders({ navigate }: { navigate: (p: string) => void }) {
  const myOrders = demoOrders.filter((o) => o.clientId === 'VW-CL-000001' || o.demo);
  return (
    <div className="orders-page">
      {myOrders.map((o) => (
        <button key={o.orderId} className="order-card" onClick={() => navigate(`Order Detail:${o.orderId}`)}>
          <div className="order-card-head">
            <strong>{o.orderId}</strong>
            <small>{o.orderDate}</small>
          </div>
          <div className="order-card-body">
            <span>{o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}</span>
            <strong>{formatINR(o.finalAmount)}</strong>
            {o.subscriberDiscount > 0 && <small className="sub-discount-line">Subscriber Discount {formatINR(o.subscriberDiscount)}</small>}
          </div>
          <div className="order-card-status">
            <span className={`status ${o.paymentStatus.toLowerCase() === 'paid' ? 'paid' : o.paymentStatus.toLowerCase() === 'failed' ? 'overdue' : 'pending'}`}>{o.paymentStatus.toUpperCase()}</span>
            <span className="order-status-badge">{o.orderStatus}</span>
          </div>
          {o.demo && <small className="demo-tag-inline">Demo Order</small>}
        </button>
      ))}
    </div>
  );
}

export function OrderDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const order = demoOrders.find((o) => o.orderId === orderId);
  if (!order) return <div className="empty-state"><Package size={36} /><h3>Order not found</h3><button className="secondary" onClick={onBack}>Back</button></div>;

  return (
    <div className="order-detail-page">
      <button className="secondary back-btn" onClick={onBack}>Back to Orders</button>
      <div className="order-detail-head">
        <div><h2>{order.orderId}</h2><small>{order.orderDate}</small></div>
        <div className="order-detail-status">
          <span className={`status ${order.paymentStatus.toLowerCase() === 'paid' ? 'paid' : order.paymentStatus.toLowerCase() === 'failed' ? 'overdue' : 'pending'}`}>{order.paymentStatus.toUpperCase()}</span>
          <span className="order-status-badge">{order.orderStatus}</span>
        </div>
      </div>

      {order.demo && <div className="fallback-banner"><AlertTriangle size={15} /> <span>Demo order data — backend order integration pending.</span></div>}

      <div className="order-detail-grid">
        <div className="order-section">
          <h4>Customer</h4>
          <div className="info-grid">
            <div><label>NAME</label><strong>{order.customerName}</strong></div>
            <div><label>PHONE</label><strong>{order.phone}</strong></div>
            <div><label>EMAIL</label><strong>{order.email}</strong></div>
            <div><label>CLIENT ID</label><strong className="cid-text">{order.clientId}</strong></div>
          </div>
        </div>
        <div className="order-section">
          <h4>Delivery</h4>
          <div className="info-grid">
            <div className="wide"><label>ADDRESS</label><strong>{order.deliveryAddress}</strong></div>
            <div><label>CITY</label><strong>{order.city}</strong></div>
            <div><label>STATE</label><strong>{order.state}</strong></div>
            <div><label>PIN</label><strong>{order.pincode}</strong></div>
          </div>
        </div>
      </div>

      <div className="order-section">
        <h4>Items</h4>
        <div className="table-card">
          <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr .6fr 1fr 1fr 1fr' }}>
            <span>PRODUCT</span><span>SKU</span><span>QTY</span><span>UNIT PRICE</span><span>DISCOUNT</span><span>TOTAL</span>
          </div>
          {order.items.map((it: ShopOrderItem) => (
            <div className="table-row" key={it.productId} style={{ gridTemplateColumns: '2fr 1fr .6fr 1fr 1fr 1fr' }}>
              <div><strong>{it.name}</strong><small>{it.animal}</small></div>
              <div><span>{it.sku}</span></div>
              <div><span>{it.quantity}</span></div>
              <div><strong>{formatINR(it.sellingPrice)}</strong></div>
              <div>{it.subscriberDiscount > 0 ? <span className="sub-discount-line">-{formatINR(it.subscriberDiscount)}</span> : <span className="muted">—</span>}</div>
              <div><strong>{formatINR(it.lineTotal)}</strong></div>
            </div>
          ))}
        </div>
      </div>

      <div className="order-detail-grid">
        <div className="order-section">
          <h4>Price Summary</h4>
          <div className="summary-row"><span>Subtotal</span><strong>{formatINR(order.subtotal)}</strong></div>
          {order.subscriberDiscount > 0 && <div className="summary-row discount"><span>Subscriber Discount</span><strong>-{formatINR(order.subscriberDiscount)}</strong></div>}
          <div className="summary-row"><span>Shipping</span><strong>{order.shipping === 0 ? 'Free' : formatINR(order.shipping)}</strong></div>
          <div className="summary-row"><span>Tax</span><strong>{order.tax === 0 ? 'Included' : formatINR(order.tax)}</strong></div>
          <div className="summary-row grand-total"><span>Grand Total</span><strong>{formatINR(order.finalAmount)}</strong></div>
        </div>
        <div className="order-section">
          <h4>Payment</h4>
          <div className="info-grid">
            <div><label>STATUS</label><strong>{order.paymentStatus}</strong></div>
            <div><label>METHOD</label><strong>{order.paymentMethod}</strong></div>
            <div><label>REFERENCE</label><strong>{order.paymentReference || 'N/A'}</strong></div>
          </div>
          <h4 style={{ marginTop: '16px' }}>Prescription</h4>
          <div className="info-grid">
            <div><label>REQUIRED</label><strong>{order.prescriptionRequired ? 'Yes' : 'No'}</strong></div>
            <div><label>UPLOADED</label><strong>{order.prescriptionUploaded ? 'Yes' : 'No'}</strong></div>
            <div><label>STATUS</label><strong>{order.prescriptionStatus}</strong></div>
          </div>
        </div>
      </div>

      <div className="order-section">
        <h4>Order Timeline</h4>
        <div className="order-timeline">
          {order.timeline.map((t, i) => (
            <div key={i} className={`timeline-step ${t.done ? 'done' : ''}`}>
              <div className="timeline-dot">{t.done ? <Check size={12} /> : <Clock size={12} />}</div>
              <div className="timeline-content">
                <strong>{t.status}</strong>
                {t.date && <small>{t.date}</small>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DoctorShop({ isSubscriber }: { isSubscriber: boolean }) {
  return <ShopCatalog isSubscriber={isSubscriber} cart={[]} setCart={() => {}} myPets={[]} selectedPet={null} setSelectedPet={() => {}} navigate={() => {}} />;
}
