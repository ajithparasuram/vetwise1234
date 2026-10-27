/**
 * VetWise Admin Shop — dashboard, product management, order management,
 * order detail with status controls.
 */

import { useState, useMemo } from 'react';
import {
  Package, ShoppingCart, Check, X, Plus, Edit, AlertTriangle,
  Pill, TrendingUp, DollarSign, Clock, Truck, MapPin,
} from 'lucide-react';
import {
  SHOP_ANIMALS, SHOP_CATEGORIES, demoProducts, demoOrders,
  getStockStatus, formatINRHelper,
  type ShopProduct, type ShopOrder, type OrderStatus,
} from '@/lib/shop-data';

const formatINR = formatINRHelper;

const ALL_STATUSES: OrderStatus[] = [
  'Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped',
  'Out for Delivery', 'Delivered', 'Cancelled',
  'Payment Pending', 'Payment Failed', 'Payment Refunded',
];

export function AdminShopDashboard() {
  const totalProducts = demoProducts.length;
  const activeProducts = demoProducts.filter((p) => p.status === 'Active').length;
  const lowStock = demoProducts.filter((p) => p.stockQty > 0 && p.stockQty <= 10).length;
  const outOfStock = demoProducts.filter((p) => p.stockQty === 0).length;
  const totalOrders = demoOrders.length;
  const pendingOrders = demoOrders.filter((o) => ['Pending', 'Payment Pending'].includes(o.orderStatus)).length;
  const processingOrders = demoOrders.filter((o) => ['Confirmed', 'Processing', 'Packed'].includes(o.orderStatus)).length;
  const shippedOrders = demoOrders.filter((o) => ['Shipped', 'Out for Delivery'].includes(o.orderStatus)).length;
  const deliveredOrders = demoOrders.filter((o) => o.orderStatus === 'Delivered').length;
  const subscriberOrders = demoOrders.filter((o) => o.isSubscriber).length;
  const subscriberDiscounts = demoOrders.reduce((s, o) => s + o.subscriberDiscount, 0);
  const revenue = demoOrders.filter((o) => o.paymentStatus === 'Paid').reduce((s, o) => s + o.finalAmount, 0);

  return (
    <>
      <div style={{ background: '#fff8e6', border: '1px solid #f0d060', borderRadius: 8, padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#8a6500', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <AlertTriangle size={15} /> Shop data is sample data — products, orders, and inventory shown here are for demonstration only.
      </div>
      <div className="stats-row four">
        <div className="stat"><strong>{totalProducts}</strong><span>Total Products</span></div>
        <div className="stat green"><strong>{activeProducts}</strong><span>Active Products</span></div>
        <div className="stat orange"><strong>{lowStock}</strong><span>Low Stock</span></div>
        <div className="stat red"><strong>{outOfStock}</strong><span>Out of Stock</span></div>
      </div>
      <div className="stats-row four">
        <div className="stat"><strong>{totalOrders}</strong><span>Total Orders</span></div>
        <div className="stat orange"><strong>{pendingOrders}</strong><span>Pending Orders</span></div>
        <div className="stat blue"><strong>{processingOrders}</strong><span>Processing</span></div>
        <div className="stat green"><strong>{deliveredOrders}</strong><span>Delivered</span></div>
      </div>
      <div className="stats-row">
        <div className="stat green"><strong>{formatINR(revenue)}</strong><span>Revenue (Paid Orders)</span></div>
        <div className="stat"><strong>{subscriberOrders}</strong><span>Subscriber Orders</span></div>
        <div className="stat orange"><strong>{formatINR(subscriberDiscounts)}</strong><span>Subscriber Discounts</span></div>
      </div>
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-title"><h3>Recent Orders</h3></div>
        {demoOrders.slice(0, 5).map((o) => (
          <div className="simple-row" key={o.orderId}>
            <div className="pet-icon"><ShoppingCart size={16} /></div>
            <div><strong>{o.orderId}</strong><small>{o.customerName} · {formatINR(o.finalAmount)}</small></div>
            <span className={`status ${o.paymentStatus.toLowerCase() === 'paid' ? 'paid' : 'pending'}`}>{o.paymentStatus.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminProducts({ onAddProduct }: { onAddProduct: () => void }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [animalFilter, setAnimalFilter] = useState('');

  const filtered = useMemo(() => {
    return demoProducts.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (animalFilter && !p.animalSpecies.includes(animalFilter)) return false;
      return true;
    });
  }, [search, categoryFilter, animalFilter]);

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="searchbar" style={{ flex: 1, minWidth: '200px' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." />
        </div>
        <select className="species-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {SHOP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="species-filter" value={animalFilter} onChange={(e) => setAnimalFilter(e.target.value)}>
          <option value="">All Animals</option>
          {SHOP_ANIMALS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <button className="primary" onClick={onAddProduct}><Plus size={16} /> Add Product</button>
      </div>
      <div className="table-card">
        <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr .8fr .8fr .6fr .8fr .8fr' }}>
          <span>PRODUCT</span><span>BRAND</span><span>CATEGORY</span><span>PRICE</span><span>STOCK</span><span>Rx</span><span>SUB DISC</span><span>STATUS</span>
        </div>
        {filtered.map((p) => {
          const stock = getStockStatus(p.stockQty);
          return (
            <div className="table-row" key={p.productId} style={{ gridTemplateColumns: '2fr 1fr 1fr .8fr .8fr .6fr .8fr .8fr' }}>
              <div><strong>{p.name}</strong><small>{p.sku}</small>{p.demo && <small className="demo-tag-inline">Demo</small>}</div>
              <div><span>{p.brand}</span></div>
              <div><span>{p.category}</span></div>
              <div><strong>{formatINR(p.sellingPrice)}</strong></div>
              <div><span className={`stock-badge stock-${stock.toLowerCase().replace(/ /g, '-')}`}>{stock}</span></div>
              <div>{p.prescriptionRequired ? <Pill size={14} color="#e73535" /> : <span className="muted">—</span>}</div>
              <div>{p.subscriberDiscountEligible ? <Check size={14} color="#0b9b55" /> : <span className="muted">—</span>}</div>
              <div><span className={`status ${p.status === 'Active' ? 'paid' : 'pending'}`}>{p.status.toUpperCase()}</span></div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function AdminOrders({ onOrderClick }: { onOrderClick: (orderId: string) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filtered = useMemo(() => {
    return demoOrders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${o.orderId} ${o.customerName}`.toLowerCase().includes(q)) return false;
      }
      if (statusFilter && o.orderStatus !== statusFilter) return false;
      return true;
    });
  }, [search, statusFilter]);

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="searchbar" style={{ flex: 1, minWidth: '200px' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Order ID, customer..." />
        </div>
        <select className="species-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="table-card">
        <div className="table-head" style={{ gridTemplateColumns: '1fr 1.5fr 1fr .6fr 1fr .8fr 1fr 1fr .8fr' }}>
          <span>ORDER ID</span><span>CUSTOMER</span><span>DATE</span><span>ITEMS</span><span>AMOUNT</span><span>SUBSCRIBER</span><span>PAYMENT</span><span>ORDER STATUS</span><span></span>
        </div>
        {filtered.map((o) => (
          <div className="table-row" key={o.orderId} style={{ gridTemplateColumns: '1fr 1.5fr 1fr .6fr 1fr .8fr 1fr 1fr .8fr' }}>
            <div><strong>{o.orderId}</strong>{o.demo && <small className="demo-tag-inline">Demo</small>}</div>
            <div><strong>{o.customerName}</strong><small className="cid-small">{o.clientId}</small></div>
            <div><span>{o.orderDate.split(',')[0]}</span></div>
            <div><span>{o.itemCount}</span></div>
            <div><strong>{formatINR(o.finalAmount)}</strong>{o.subscriberDiscount > 0 && <small className="sub-discount-line">Disc {formatINR(o.subscriberDiscount)}</small>}</div>
            <div>{o.isSubscriber ? <Check size={14} color="#0b9b55" /> : <span className="muted">—</span>}</div>
            <div><span className={`status ${o.paymentStatus.toLowerCase() === 'paid' ? 'paid' : o.paymentStatus.toLowerCase() === 'failed' ? 'overdue' : 'pending'}`}>{o.paymentStatus.toUpperCase()}</span></div>
            <div><span className="order-status-badge">{o.orderStatus}</span></div>
            <button className="link" onClick={() => onOrderClick(o.orderId)}>View <ShoppingCart size={12} /></button>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminOrderDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const order = demoOrders.find((o) => o.orderId === orderId);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order?.orderStatus ?? 'Pending');

  if (!order) return <div className="empty-state"><Package size={36} /><h3>Order not found</h3><button className="secondary" onClick={onBack}>Back</button></div>;

  const advanceStatus = () => {
    const flow: OrderStatus[] = ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const idx = flow.indexOf(currentStatus);
    if (idx >= 0 && idx < flow.length - 1) setCurrentStatus(flow[idx + 1]);
  };
  const cancelOrder = () => setCurrentStatus('Cancelled');

  return (
    <div className="order-detail-page">
      <button className="secondary back-btn" onClick={onBack}>Back to Orders</button>
      <div className="order-detail-head">
        <div><h2>{order.orderId}</h2><small>{order.orderDate}</small></div>
        <div className="order-detail-status">
          <span className={`status ${order.paymentStatus.toLowerCase() === 'paid' ? 'paid' : 'pending'}`}>{order.paymentStatus.toUpperCase()}</span>
          <span className="order-status-badge">{currentStatus}</span>
        </div>
      </div>

      {order.demo && <div className="fallback-banner"><AlertTriangle size={15} /> <span>Demo order — backend order management pending.</span></div>}

      <div className="admin-order-controls">
        <strong>Update Order Status:</strong>
        <select className="species-filter" value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value as OrderStatus)}>
          {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {!['Delivered', 'Cancelled', 'Payment Failed'].includes(currentStatus) && (
          <button className="primary" onClick={advanceStatus}><Check size={14} /> Advance to Next Stage</button>
        )}
        {!['Delivered', 'Cancelled', 'Payment Failed'].includes(currentStatus) && (
          <button className="danger-btn" onClick={cancelOrder}><X size={14} /> Cancel Order</button>
        )}
      </div>

      <div className="order-detail-grid">
        <div className="order-section">
          <h4>Customer Information</h4>
          <div className="info-grid">
            <div><label>CLIENT ID</label><strong className="cid-text">{order.clientId}</strong></div>
            <div><label>NAME</label><strong>{order.customerName}</strong></div>
            <div><label>PHONE</label><strong>{order.phone}</strong></div>
            <div><label>EMAIL</label><strong>{order.email}</strong></div>
          </div>
        </div>
        <div className="order-section">
          <h4>Delivery Information</h4>
          <div className="info-grid">
            <div className="wide"><label>ADDRESS</label><strong>{order.deliveryAddress}</strong></div>
            <div><label>CITY</label><strong>{order.city}</strong></div>
            <div><label>STATE</label><strong>{order.state}</strong></div>
            <div><label>PIN</label><strong>{order.pincode}</strong></div>
          </div>
        </div>
      </div>

      <div className="order-section">
        <h4>Order Items</h4>
        <div className="table-card">
          <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr .6fr 1fr 1fr 1fr 1fr' }}>
            <span>PRODUCT</span><span>SKU</span><span>QTY</span><span>MRP</span><span>SELLING</span><span>DISCOUNT</span><span>TOTAL</span>
          </div>
          {order.items.map((it) => (
            <div className="table-row" key={it.productId} style={{ gridTemplateColumns: '2fr 1fr .6fr 1fr 1fr 1fr 1fr' }}>
              <div><strong>{it.name}</strong><small>{it.animal}</small></div>
              <div><span>{it.sku}</span></div>
              <div><span>{it.quantity}</span></div>
              <div><span>{formatINR(it.mrp)}</span></div>
              <div><strong>{formatINR(it.sellingPrice)}</strong></div>
              <div>{it.subscriberDiscount > 0 ? <span className="sub-discount-line">-{formatINR(it.subscriberDiscount)}</span> : <span className="muted">—</span>}</div>
              <div><strong>{formatINR(it.lineTotal)}</strong></div>
            </div>
          ))}
        </div>
      </div>

      <div className="order-detail-grid">
        <div className="order-section">
          <h4>Price Breakdown</h4>
          <div className="summary-row"><span>Subtotal</span><strong>{formatINR(order.subtotal)}</strong></div>
          {order.subscriberDiscount > 0 && <div className="summary-row discount"><span>Subscriber Discount</span><strong>-{formatINR(order.subscriberDiscount)}</strong></div>}
          <div className="summary-row"><span>Shipping</span><strong>{order.shipping === 0 ? 'Free' : formatINR(order.shipping)}</strong></div>
          <div className="summary-row"><span>Tax</span><strong>{order.tax === 0 ? 'Included' : formatINR(order.tax)}</strong></div>
          <div className="summary-row grand-total"><span>Grand Total</span><strong>{formatINR(order.finalAmount)}</strong></div>
        </div>
        <div className="order-section">
          <h4>Payment Information</h4>
          <div className="info-grid">
            <div><label>STATUS</label><strong>{order.paymentStatus}</strong></div>
            <div><label>METHOD</label><strong>{order.paymentMethod}</strong></div>
            <div><label>REFERENCE</label><strong>{order.paymentReference || 'N/A'}</strong></div>
            <div><label>AMOUNT PAID</label><strong>{order.paymentStatus === 'Paid' ? formatINR(order.finalAmount) : '—'}</strong></div>
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
        <h4>Fulfilment Information</h4>
        <div className="info-grid">
          <div><label>ORDER STATUS</label><strong>{currentStatus}</strong></div>
          <div><label>PAYMENT STATUS</label><strong>{order.paymentStatus}</strong></div>
          <div><label>SHIPPING PARTNER</label><strong>— (placeholder)</strong></div>
          <div><label>TRACKING NUMBER</label><strong>— (placeholder)</strong></div>
          <div className="wide"><label>TRACKING URL</label><strong>— (placeholder)</strong></div>
        </div>
      </div>

      <div className="order-section">
        <h4>Order Timeline</h4>
        <div className="order-timeline">
          {order.timeline.map((t, i) => (
            <div key={i} className={`timeline-step ${t.done ? 'done' : ''}`}>
              <div className="timeline-dot">{t.done ? <Check size={12} /> : <Clock size={12} />}</div>
              <div className="timeline-content"><strong>{t.status}</strong>{t.date && <small>{t.date}</small>}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminInventory() {
  const lowStockProducts = demoProducts.filter((p) => p.stockQty > 0 && p.stockQty <= 10);
  const outOfStockProducts = demoProducts.filter((p) => p.stockQty === 0);
  const totalAlerts = lowStockProducts.length + outOfStockProducts.length;

  return (
    <>
      {totalAlerts > 0 && (
        <div className="inventory-alerts-banner">
          <AlertTriangle size={18} />
          <div>
            <strong>{totalAlerts} Inventory Alert{totalAlerts > 1 ? 's' : ''}</strong>
            <p>{lowStockProducts.length} low stock, {outOfStockProducts.length} out of stock — review and restock soon.</p>
          </div>
        </div>
      )}

      <div className="stats-row four" style={{ marginBottom: '16px' }}>
        <div className="stat green"><strong>{demoProducts.filter((p) => p.stockQty > 10).length}</strong><span>In Stock</span></div>
        <div className="stat orange"><strong>{lowStockProducts.length}</strong><span>Low Stock (≤10)</span></div>
        <div className="stat red"><strong>{outOfStockProducts.length}</strong><span>Out of Stock</span></div>
        <div className="stat"><strong>{demoProducts.length}</strong><span>Total Products</span></div>
      </div>

      <div className="table-card">
        <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr .8fr .8fr 1fr' }}>
          <span>PRODUCT</span><span>SKU</span><span>CATEGORY</span><span>STOCK QTY</span><span>STATUS</span><span>ALERTS</span>
        </div>
        {demoProducts.map((p) => {
          const stock = getStockStatus(p.stockQty);
          const isLow = p.stockQty > 0 && p.stockQty <= 10;
          const isOut = p.stockQty === 0;
          return (
            <div className="table-row" key={p.productId} style={{ gridTemplateColumns: '2fr 1fr 1fr .8fr .8fr 1fr' }}>
              <div><strong>{p.name}</strong>{p.demo && <small className="demo-tag-inline">Demo</small>}</div>
              <div><span>{p.sku}</span></div>
              <div><span>{p.category}</span></div>
              <div><strong style={{ color: isOut ? '#e73535' : isLow ? '#d97706' : '#1a2a44' }}>{p.stockQty}</strong></div>
              <div><span className={`stock-badge stock-${stock.toLowerCase().replace(/ /g, '-')}`}>{stock}</span></div>
              <div>
                {isOut && <span className="alert-badge alert-critical">OUT OF STOCK</span>}
                {isLow && <span className="alert-badge alert-warning">LOW STOCK</span>}
                {!isLow && !isOut && <span className="muted">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function AddProductModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">VETWISE SHOP</p><h2>Add New Product</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-scroll">
          <div className="form-section">
            <div className="form-section-header"><Package size={16} /> <span>Product Information</span></div>
            <div className="form-grid">
              <label>Product Name<input placeholder="Enter product name" /></label>
              <label>SKU<input placeholder="Product SKU" /></label>
              <label>Brand<input placeholder="Brand name" /></label>
              <label>Manufacturer<input placeholder="Manufacturer" /></label>
              <label>Category<select><option value="">Select category</option>{SHOP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>Subcategory<input placeholder="Subcategory" /></label>
              <label className="wide">Animal Species<select multiple style={{ minHeight: '60px' }}>{SHOP_ANIMALS.map((a) => <option key={a}>{a}</option>)}</select></label>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-header"><Pill size={16} /> <span>Product Details</span></div>
            <div className="form-grid">
              <label className="wide">Description<textarea placeholder="Product description" /></label>
              <label className="wide">Benefits<textarea placeholder="Key benefits" /></label>
              <label className="wide">Composition / Ingredients<textarea placeholder="Ingredients or composition" /></label>
              <label className="wide">Usage Information<textarea placeholder="How to use" /></label>
              <label>Dosage<input placeholder="Dosage instructions" /></label>
              <label>Pack Size<input placeholder="e.g. 30" /></label>
              <label>Unit<input placeholder="e.g. tablets, kg, ml" /></label>
              <label>Age / Life Stage<input placeholder="e.g. Puppy, Adult" /></label>
              <label>Weight Range<input placeholder="e.g. All sizes" /></label>
              <label className="wide">Storage Instructions<input placeholder="Storage instructions" /></label>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-header"><DollarSign size={16} /> <span>Pricing & Inventory</span></div>
            <div className="form-grid">
              <label>MRP (₹)<input type="number" placeholder="0" /></label>
              <label>Selling Price (₹)<input type="number" placeholder="0" /></label>
              <label>Stock Quantity<input type="number" placeholder="0" /></label>
              <label>Status<select><option>Active</option><option>Inactive</option></select></label>
              <label className="toggle-row"><input type="checkbox" /> <span>Prescription Required</span></label>
              <label className="toggle-row"><input type="checkbox" /> <span>Subscriber Discount Eligible</span></label>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={() => { alert('Product creation requires backend API integration.'); onClose(); }}><Check size={16} /> Create Product</button>
        </div>
      </div>
    </div>
  );
}
