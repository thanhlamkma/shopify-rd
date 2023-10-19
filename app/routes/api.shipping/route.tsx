import type { ActionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type {
  ShippingRateDestination,
  ShippingRateItem,
  ShippingRateResponse,
} from "./models";

export const action = async ({ request }: ActionArgs) => {
  console.log("request", request);

  // Parse the request data
  const { destination, items } = JSON.parse(await request.text());

  // Calculate shipping rates based on your logic
  const shippingRates = calculateShippingRates(destination, items);

  // Format the response
  const response: ShippingRateResponse = {
    rates: shippingRates.map((rate) => ({
      service_name: rate.serviceName,
      service_code: rate.serviceCode,
      total_price: rate.totalPrice,
      currency: rate.currency,
      description: rate.description,
    })),
  };

  // Respond with the API response
  return json(response);
};

// Calculate shipping rates based on your business logic
function calculateShippingRates(
  destination?: ShippingRateDestination,
  items?: ShippingRateItem[]
) {
  // Your logic here to calculate shipping rates
  // Return an array of shipping rate objects with service name, service code, total price, description and currency
  const shippingRates = [
    {
      serviceName: "Giao hàng tiết kiệm",
      serviceCode: "STANDARD",
      description: "Giao trong 5 ngày",
      totalPrice: 1000000,
      currency: "VND",
    },
    {
      serviceName: "Giao hàng nhanh",
      serviceCode: "EXPRESS",
      description: "Giao trong 2 ngày",
      totalPrice: 2000000,
      currency: "VND",
    },
  ];

  return shippingRates;
}
