/**
 * Adds 23% VAT to a net amount and returns the gross amount, rounded to the
 * nearest cent.
 *
 * @param {number} amount The net amount before VAT.
 * @returns {number} The gross amount including 23% VAT.
 */
function calculateVat(amount) {
  return Math.round(amount * 1.23 * 100) / 100;
}

module.exports = { calculateVat };
