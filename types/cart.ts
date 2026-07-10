export type SupplementOption = {
  id: string;
  name: string;
  price: number;
};

export type CartSupplement = SupplementOption;

export type CartLineItem = {
  lineId: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  baseUnitPrice: number;
  supplements: CartSupplement[];
  quantity: number;
};

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  delivery: number;
  tax: number;
  total: number;
};

export type AddToCartPayload = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  baseUnitPrice: number;
  supplements: CartSupplement[];
  quantity: number;
};
