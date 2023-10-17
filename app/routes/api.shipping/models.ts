// Shipping rate request
export interface ShippingRateOrigin {
  country: string;
  postal_code: string;
  province: string;
  city: string;
  name: string;
  address1: string;
  address2: string;
  address3: string;
  phone: string;
  fax: string;
  email: string;
  address_type: string;
  company_name: string;
}

export interface ShippingRateDestination {
  country: string;
  postal_code: string;
  province: string;
  city: string;
  name: string;
  address1: string;
  address2: string;
  address3: string;
  phone: string;
  fax: string;
  email: string;
  address_type: string;
  company_name: string;
}

export interface ShippingRateItem {
  name: string;
  sku: string;
  quantity: number;
  grams: number;
  price: number;
  vendor: string;
  requires_shipping: boolean;
  taxable: boolean;
  fulfillment_service: string;
  properties: string;
  product_id: number;
  variant_id: number;
}

export type ShippingRateRequest = Partial<{
  rate: {
    origin: Partial<ShippingRateOrigin>;
    destination: Partial<ShippingRateDestination>;
    items: Partial<ShippingRateItem>[];
    currency: string;
    locale: string;
  };
}>;

// Shipping rate response
export interface ShippingRateResponse {
  rates: {
    service_name: string;
    description: string;
    service_code: string;
    currency: string;
    total_price: number;
    phone_required?: string;
    min_delivery_date?: string;
    max_delivery_date?: string;
  }[];
}
