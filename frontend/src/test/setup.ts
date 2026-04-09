import '@testing-library/jest-dom';

// Add BigInt serialization support for JSON.stringify (matching backend behavior)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
