const generateOrderNumber = () => {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${ts}-${rnd}`;
};

const generateInvoiceNumber = () => {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${yr}${mo}-${rnd}`;
};

const calculateGST = (amount, gstRate = 5) => {
  const total = (amount * gstRate) / 100;
  const cgst  = total / 2;
  const sgst  = total / 2;
  return { cgst: +cgst.toFixed(2), sgst: +sgst.toFixed(2), total: +total.toFixed(2) };
};

const slugify = (text) =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const generateSlug = (name) => `${slugify(name)}-${Date.now().toString(36)}`;

module.exports = { generateOrderNumber, generateInvoiceNumber, calculateGST, slugify, generateSlug };
