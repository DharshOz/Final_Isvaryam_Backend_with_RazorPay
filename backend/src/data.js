export const sample_foods = [
  {
    productId: '1',
    name: 'Coconut Oil',
    price: 12,
    description: 'Pure coconut oil, ideal for cooking and skin care.',
    images: [
      'https://dukaan.b-cdn.net/979x979/webp/6890672/a812a924-0cbf-4f06-b97a-7e024f3c4f49/category-image-1-b61efcd3-fdb3-422a-b8d9-89029c9f2c32.png/2b64a213-a626-46d5-bd01-6fd103372263.png'
    ],
    category: 'Cooking Oil',
    specifications: [
      { name: 'Type', value: 'Cold Pressed' },
      { name: 'Origin', value: 'India' }
    ],
    quantities: [
      { size: '500ml', price: 12 },
      { size: '1L', price: 22 }
    ],
    tags: ['Cooking', 'Natural', 'Cold Pressed']
  },
  {
    productId: '2',
    name: 'Jaggery Powder',
    price: 8,
    description: 'Organic jaggery powder, a healthy natural sweetener.',
    images: [
      'https://dukaan.b-cdn.net/979x979/webp/6890672/a812a924-0cbf-4f06-b97a-7e024f3c4f49/category-image-1b589bb6-3474-4ba7-a94d-7b3997336726.png/faa40d36-8462-4431-ab3b-9f3be119bf74.png'
    ],
    category: 'Sweetener',
    specifications: [
      { name: 'Quality', value: 'Organic' },
      { name: 'Origin', value: 'India' }
    ],
    quantities: [
      { size: '500g', price: 5 },
      { size: '1kg', price: 8 }
    ],
    tags: ['Sweetener', 'Organic', 'Natural']
  },
  {
    productId: '3',
    name: 'Ghee',
    price: 15,
    description: 'Traditional clarified butter, rich and flavorful.',
    images: [
      'https://dukaan.b-cdn.net/979x979/webp/6890672/a812a924-0cbf-4f06-b97a-7e024f3c4f49/category-image-1-4b7b9e2e-8c2e-4d8e-9b2e-8c2e4d8e9b2e.png'
    ],
    category: 'Dairy',
    specifications: [
      { name: 'Type', value: 'Cow Ghee' },
      { name: 'Origin', value: 'India' }
    ],
    quantities: [
      { size: '250g', price: 8 },
      { size: '500g', price: 15 },
      { size: '1kg', price: 28 }
    ],
    tags: ['Dairy', 'Natural', 'Flavorful']
  }
];

export const sample_tags = [
  { name: 'All', count: 6 },
  { name: 'Cooking', count: 5 },
  { name: 'Natural', count: 3 },
  { name: 'Cold Pressed', count: 3 },
  { name: 'Organic', count: 1 },
  { name: 'Sweetener', count: 1 },
  { name: 'Dairy', count: 1 },
  { name: 'Refined', count: 1 },
  { name: 'Flavorful', count: 1 },
  { name: 'Asian Cuisine', count: 1 },
  { name: 'Spicy', count: 1 },
];

export const sample_users = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@gmail.com',
    password: '12345',
    address: 'Toronto On',
    isAdmin: false,
  },
  {
    id: 2,
    name: 'Jane Doe',
    email: 'jane@gmail.com',
    password: '12345',
    address: 'Shanghai',
    isAdmin: true,
  },
];