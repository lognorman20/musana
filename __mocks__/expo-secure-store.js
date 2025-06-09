const store = {};

module.exports = {
  setItemAsync: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key) => {
    return Promise.resolve(store[key] || null);
  }),
}; 