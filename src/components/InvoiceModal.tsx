/**
 * InvoiceModal — professional invoice creation and viewing.
 * Supports line items, tax calculation, draft/issue states, and PDF-ready layout.
 */

import { useState, useMemo } from 'react';
import { X, Check, Plus, Trash2, Loader2, DollarSign, FileText, Printer } from 'lucide-react';
import { createInvoice, updateInvoiceStatus } from '@/lib/queries';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  taxPercent: string;
}

const SERVICE_TEMPLATES: Record<string, Partial<LineItem>> = {
  'Consultation': { description: 'Veterinary Consultation', unitPrice: '500', taxPercent: '18' },
  'Vaccination': { description: 'Vaccination', unitPrice: '800', taxPercent: '5' },
  'Diagnostic': { description: 'Diagnostic Test', unitPrice: '1200', taxPercent: '18' },
  'Laboratory': { description: 'Laboratory Test', unitPrice: '600', taxPercent: '18' },
  'Treatment': { description: 'Treatment Procedure', unitPrice: '1500', taxPercent: '18' },
  'Surgery': { description: 'Surgical Procedure', unitPrice: '5000', taxPercent: '18' },
  'Medication': { description: 'Medication', unitPrice: '300', taxPercent: '18' },
  'Custom': { description: '', unitPrice: '', taxPercent: '0' },
};

interface Props {
  clientId: string;
  patientId: string;
  patientName: string;
  clientName: string;
  invoice?: any | null;
  mode: 'create' | 'view';
  onClose: () => void;
  onSaved: () => void;
}

const emptyItem: LineItem = { description: '', quantity: '1', unitPrice: '', taxPercent: '0' };

export function InvoiceModal({ clientId, patientId, patientName, clientName, invoice, mode, onClose, onSaved }: Props) {
  const isView = mode === 'view' && invoice;
  const [items, setItems] = useState<LineItem[]>(
    isView ? (invoice.line_items ?? []).map((li: any) => ({
      description: li.description ?? '',
      quantity: String(li.quantity ?? 1),
      unitPrice: String(li.unitPrice ?? 0),
      taxPercent: String(li.taxPercent ?? 0),
    })) : [{ ...emptyItem }],
  );
  const [discount, setDiscount] = useState(isView ? String(invoice.discount ?? 0) : '0');
  const [dueDate, setDueDate] = useState(isView ? (invoice.due_date ?? '') : '');
  const [notes, setNotes] = useState(isView ? (invoice.notes ?? '') : '');
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(isView ? invoice : null);

  const calc = useMemo(() => {
    let subtotal = 0, taxAmount = 0;
    items.forEach((li) => {
      const qty = parseFloat(li.quantity) || 0;
      const price = parseFloat(li.unitPrice) || 0;
      const tax = parseFloat(li.taxPercent) || 0;
      const lineTotal = qty * price;
      subtotal += lineTotal;
      taxAmount += lineTotal * tax / 100;
    });
    const disc = parseFloat(discount) || 0;
    const total = subtotal + taxAmount - disc;
    return { subtotal, taxAmount, disc, total };
  }, [items, discount]);

  const addItem = () => setItems((arr) => [...arr, { ...emptyItem }]);
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, val: string) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const applyTemplate = (i: number, template: string) => {
    const tpl = SERVICE_TEMPLATES[template];
    if (!tpl) return;
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, ...tpl, description: tpl.description ?? item.description } : item));
  };

  const validate = (): string | null => {
    const validItems = items.filter((li) => li.description.trim() && parseFloat(li.quantity) > 0 && parseFloat(li.unitPrice) >= 0);
    if (validItems.length === 0) return 'Add at least one line item with a description and quantity';
    return null;
  };

  const handleSave = async (status: string) => {
    const v = validate();
    if (v) { setError(v); return; }
    const isIssue = status === 'issued';
    setSaving(!isIssue); setIssuing(isIssue); setError(null);

    const lineItems = items
      .filter((li) => li.description.trim())
      .map((li) => ({
        description: li.description.trim(),
        quantity: parseFloat(li.quantity) || 1,
        unitPrice: parseFloat(li.unitPrice) || 0,
        taxPercent: parseFloat(li.taxPercent) || 0,
      }));

    const { data, error: err } = await createInvoice({
      clientId,
      patientId,
      lineItems,
      discount: parseFloat(discount) || 0,
      status,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false); setIssuing(false);
    if (err || !data) { setError(err ?? 'Failed to save invoice'); return; }
    setCreatedInvoice(data);
    onSaved();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">VETWISE</p>
            <h2>{isView ? `Invoice ${createdInvoice?.invoice_id ?? createdInvoice?.invoiceId ?? ''}` : 'Create Invoice'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-scroll">
          <div className="rx-patient-bar">
            <div><label>CLIENT</label><strong>{clientName}</strong></div>
            <div><label>PATIENT</label><strong>{patientName}</strong></div>
            {createdInvoice && <div><label>INVOICE ID</label><strong className="pid-text">{createdInvoice.invoice_id ?? createdInvoice.invoiceId}</strong></div>}
            {createdInvoice && <div><label>STATUS</label><strong><em className={`status ${(createdInvoice.status ?? 'draft').toLowerCase().replace('_', '')}`}>{(createdInvoice.status ?? 'DRAFT').toUpperCase()}</em></strong></div>}
          </div>

          {!isView || !createdInvoice ? (
            <>
              <div className="form-section">
                <div className="form-section-header">
                  <FileText size={16} /><span>Line Items</span>
                  <button type="button" className="ghost-btn" onClick={addItem}><Plus size={14} /> Add Item</button>
                </div>
                <div className="form-section-body">
                  {items.map((item, i) => (
                    <div className="med-card" key={i}>
                      <div className="med-card-head">
                        <select className="line-item-template" value="" onChange={(e) => applyTemplate(i, e.target.value)}>
                          <option value="">Quick add...</option>
                          {Object.keys(SERVICE_TEMPLATES).map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {items.length > 1 && <button type="button" className="icon-btn sm" onClick={() => removeItem(i)}><Trash2 size={14} /></button>}
                      </div>
                      <div className="form-grid" style={{ gridTemplateColumns: '2fr 80px 120px 80px' }}>
                        <label>Description<input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Service or item description" /></label>
                        <label>Qty<input type="number" min="1" step="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} /></label>
                        <label>Unit Price (₹)<input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} placeholder="0.00" /></label>
                        <label>Tax %<input type="number" min="0" step="0.5" value={item.taxPercent} onChange={(e) => updateItem(i, 'taxPercent', e.target.value)} placeholder="0" /></label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header"><DollarSign size={16} /><span>Summary</span></div>
                <div className="form-section-body">
                  <div className="invoice-calc-grid">
                    <div className="invoice-calc-row"><span>Subtotal</span><strong>₹{calc.subtotal.toFixed(2)}</strong></div>
                    <div className="invoice-calc-row"><span>Tax</span><strong>₹{calc.taxAmount.toFixed(2)}</strong></div>
                    <label className="invoice-calc-row">
                      <span>Discount (₹)</span>
                      <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ width: '100px' }} />
                    </label>
                    <div className="invoice-calc-row total"><span>Total</span><strong>₹{calc.total.toFixed(2)}</strong></div>
                  </div>
                  <div className="form-grid" style={{ marginTop: '12px' }}>
                    <label>Due Date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
                    <label className="wide">Notes<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, additional info" /></label>
                  </div>
                </div>
              </div>

              {error && <p className="login-error" role="alert">{error}</p>}
            </>
          ) : (
            <InvoiceView invoice={createdInvoice} patientName={patientName} clientName={clientName} />
          )}
        </div>

        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>{createdInvoice ? 'Close' : 'Cancel'}</button>
          {createdInvoice && <button className="secondary" onClick={handlePrint}><Printer size={16} /> Print</button>}
          {!createdInvoice && (
            <>
              <button className="secondary" onClick={() => handleSave('draft')} disabled={saving || issuing}>
                {saving ? <Loader2 size={14} className="spin" /> : <Check size={16} />} Save Draft
              </button>
              <button className="primary" onClick={() => handleSave('issued')} disabled={saving || issuing}>
                {issuing ? <Loader2 size={14} className="spin" /> : <Check size={16} />} Issue Invoice
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceView({ invoice, patientName, clientName }: { invoice: any; patientName: string; clientName: string }) {
  const lineItems = invoice.line_items ?? [];
  const subtotal = parseFloat(invoice.subtotal ?? 0);
  const tax = parseFloat(invoice.tax_amount ?? 0);
  const discount = parseFloat(invoice.discount ?? 0);
  const total = parseFloat(invoice.total ?? 0);
  const paid = parseFloat(invoice.paid_amount ?? 0);
  const outstanding = total - paid;

  return (
    <div className="invoice-view">
      <div className="invoice-view-header">
        <div><strong className="pid-text">{invoice.invoice_id ?? invoice.invoiceId}</strong></div>
        <div><label>DATE</label><strong>{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-IN') : '—'}</strong></div>
        <div><label>DUE DATE</label><strong>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '—'}</strong></div>
        <div><label>STATUS</label><strong><em className={`status ${(invoice.status ?? 'draft').toLowerCase().replace('_', '')}`}>{(invoice.status ?? 'DRAFT').toUpperCase()}</em></strong></div>
      </div>

      <div className="invoice-view-parties">
        <div><label>BILLED TO</label><strong>{clientName}</strong></div>
        <div><label>PATIENT</label><strong>{patientName}</strong></div>
      </div>

      <div className="invoice-line-items">
        <div className="table-head" style={{ gridTemplateColumns: '2fr 60px 100px 80px 100px' }}>
          <span>DESCRIPTION</span><span>QTY</span><span>UNIT PRICE</span><span>TAX%</span><span>AMOUNT</span>
        </div>
        {lineItems.map((li: any, i: number) => {
          const amount = (li.quantity ?? 0) * (li.unitPrice ?? 0);
          return (
            <div className="table-row" key={i} style={{ gridTemplateColumns: '2fr 60px 100px 80px 100px', cursor: 'default' }}>
              <div><strong>{li.description}</strong></div>
              <div><span>{li.quantity}</span></div>
              <div><span>₹{(li.unitPrice ?? 0).toFixed(2)}</span></div>
              <div><span>{li.taxPercent ?? 0}%</span></div>
              <div><strong>₹{amount.toFixed(2)}</strong></div>
            </div>
          );
        })}
      </div>

      <div className="invoice-totals">
        <div className="invoice-calc-row"><span>Subtotal</span><strong>₹{subtotal.toFixed(2)}</strong></div>
        <div className="invoice-calc-row"><span>Tax</span><strong>₹{tax.toFixed(2)}</strong></div>
        {discount > 0 && <div className="invoice-calc-row"><span>Discount</span><strong>-₹{discount.toFixed(2)}</strong></div>}
        <div className="invoice-calc-row total"><span>Total</span><strong>₹{total.toFixed(2)}</strong></div>
        {paid > 0 && <div className="invoice-calc-row"><span>Paid</span><strong style={{ color: '#0b9b55' }}>₹{paid.toFixed(2)}</strong></div>}
        <div className="invoice-calc-row total"><span>Outstanding</span><strong style={{ color: outstanding > 0 ? '#e73535' : '#0b9b55' }}>₹{outstanding.toFixed(2)}</strong></div>
      </div>

      {invoice.notes && <p className="invoice-notes"><strong>Notes:</strong> {invoice.notes}</p>}
    </div>
  );
}
