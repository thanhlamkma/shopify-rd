import type { AdminApiContext } from "node_modules/@shopify/shopify-app-remix/build/ts/server/clients";
import { GET_PRODUCTS_QUERY } from "./request";

export const graphqlRequest = async (
  admin: AdminApiContext,
  request: string,
  variables: any
) => {
  const response = await admin.graphql(request, { variables });

  const responseJson = await response.json();

  return responseJson;
};

export const getProductsRequest = async (
  admin: AdminApiContext,
  variables: {
    first: number;
  }
) => {
  const response = await admin.graphql(GET_PRODUCTS_QUERY, {
    variables: variables,
  });

  const responseJson = await response.json();

  return (
    responseJson?.data?.products?.edges.map((item: any) => item.node) ?? []
  );
};
