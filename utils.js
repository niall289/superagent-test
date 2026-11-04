/**
 * Adds 23% VAT to a net amount and returns the gross amount, rounded to the
 * nearest cent.
 *
 * @param {number} amount The net amount before VAT.
 * @returns {number} The gross amount including 23% VAT.
 *
 * The function is exported for CommonJS consumers and is also available as a
 * global when this file is loaded with a classic <script> tag.
 */
function calculateVat(amount) {
  return Math.round(amount * 1.23 * 100) / 100;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateVat };
}
