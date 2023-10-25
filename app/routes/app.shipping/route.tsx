import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { Badge, Button, IndexTable, LegacyCard, Page } from "@shopify/polaris";
import { DataType } from "@shopify/shopify-api";
import type { AdminApiContext } from "node_modules/@shopify/shopify-app-remix/build/ts/server/clients";
import { useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";

const API_PATH = "/admin/api/2023-10/carrier_services.json";

const genPath = (id?: string) => {
  return id ? `/admin/api/2023-10/carrier_services/${id}.json` : API_PATH;
};

export const loader = async ({ request }: LoaderArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.rest.get({
    path: API_PATH,
  });

  const responseJson = await response.json();

  return json({
    shipping: responseJson,
  });
};

export const action = async ({ request }: ActionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const carrierId = await formData.get("carrierId");

  if (request.method === "POST") {
    const response = await handleCreateRequest(admin, request);

    // try {
    //   const response = await fetch(
    //     "https://lyric-cab-testimonials-arg.trycloudflare.com/api/shipping",
    //     {
    //       headers: {
    //         "X-Shopify-Access-Token": session.accessToken ?? "",
    //         "Content-Type": "application/json",
    //       },
    //       method: "POST",
    //       body: JSON.stringify({
    //         rate: {
    //           origin: {
    //             country: "CA",
    //             postal_code: "K2P1L4",
    //             province: "ON",
    //             city: "Ottawa",
    //             name: null,
    //             address1: "150 Elgin St.",
    //             address2: "",
    //             address3: null,
    //             phone: null,
    //             fax: null,
    //             email: null,
    //             address_type: null,
    //             company_name: "Jamie D's Emporium",
    //           },
    //           destination: {
    //             country: "CA",
    //             postal_code: "K1M1M4",
    //             province: "ON",
    //             city: "Ottawa",
    //             name: "Bob Norman",
    //             address1: "24 Sussex Dr.",
    //             address2: "",
    //             address3: null,
    //             phone: null,
    //             fax: null,
    //             email: null,
    //             address_type: null,
    //             company_name: null,
    //           },
    //           items: [
    //             {
    //               name: "Short Sleeve T-Shirt",
    //               sku: "",
    //               quantity: 1,
    //               grams: 1000,
    //               price: 1999,
    //               vendor: "Jamie D's Emporium",
    //               requires_shipping: true,
    //               taxable: true,
    //               fulfillment_service: "manual",
    //               properties: null,
    //               product_id: 48447225880,
    //               variant_id: 258644705304,
    //             },
    //           ],
    //           currency: "USD",
    //           locale: "en",
    //         },
    //       }),
    //     }
    //   );

    //   const responseJson = await response.json();

    //   console.log("responseJson", responseJson);

    //   return null;
    // } catch (error) {
    //   console.log("Error call API", error);
    //   return new Response("Failed to call API");
    // }

    const responseJson = await response.json();

    return responseJson;
  } else if (request.method === "PUT") {
    const response = await handleUpdateRequest(
      admin,
      carrierId?.toString() ?? "",
      request
    );

    return response;
  } else {
    const response = await handleDeleteRequest(
      admin,
      carrierId?.toString() ?? ""
    );

    return response;
  }
};

const handleCreateRequest = async (admin: AdminApiContext, data: any) => {
  try {
    const response = await admin.rest.post({
      path: API_PATH,
      data: {
        carrier_service: {
          name: "Shipping Rate Provider",
          callback_url: `${process.env.SHOPIFY_APP_URL}/api/shipping`,
          service_discovery: true,
        },
      },
      type: DataType.JSON,
    });

    if (!response.ok) {
      throw new Error("Failed to create carrier");
    }

    const responseJson = await response.json();

    return responseJson;
  } catch (error) {
    console.log("ERROR: Failed to create carrier", error);

    return new Response("Error occurred while creating carrier", {
      status: 500,
    });
  }
};

const handleUpdateRequest = async (
  admin: AdminApiContext,
  carrierId: string,
  data: any
) => {
  try {
    const response = await admin.rest.put({
      path: genPath(carrierId),
      data: {
        carrier_service: {
          id: carrierId,
          name: "Shipping Rate Provider",
          callback_url: `${process.env.SHOPIFY_APP_URL}/api/shipping`,
          service_discovery: true,
        },
      },
      type: DataType.JSON,
    });

    if (!response.ok) {
      throw new Error("Failed to update carrier");
    }

    const responseJson = await response.json();

    return responseJson;
  } catch (error) {
    console.log("ERROR: Failed to update carrier", error);

    return new Response("Error occurred while update carrier", {
      status: 500,
    });
  }
};

const handleDeleteRequest = async (
  admin: AdminApiContext,
  carrierId: string
) => {
  try {
    const response = await admin.rest.delete({
      path: genPath(carrierId),
    });

    if (!response.ok) {
      throw new Error("Failed to delete carrier");
    }

    const responseJson = await response.json();

    return responseJson;
  } catch (error) {
    console.log("ERROR: Failed to delete carrier", error);

    return new Response("Error occurred while delete carrier", {
      status: 500,
    });
  }
};

export default function Shipping() {
  const { shipping } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const [shippingData, setShippingData] = useState(
    shipping.carrier_services ?? []
  );

  // Actions
  const handleCreateCarrier = () =>
    submit({}, { method: "POST", replace: true });

  const handleUpdateCarrier = (carrierId: number) =>
    submit({ carrierId: carrierId }, { method: "PUT", replace: true });

  const handleDeleteCarrier = (carrierId: number) =>
    submit({ carrierId: carrierId }, { method: "DELETE", replace: true });

  // const handleCallAPI = () => submit({}, { method: "POST", replace: true });

  useEffect(() => {
    console.log("shipping", shipping);
    setShippingData(shipping.carrier_services ?? []);
  }, [shipping]);

  return (
    <Page
      title="Dịch vụ vận chuyển"
      primaryAction={{
        content: "Thêm mới",
        helpText: "Thêm mới dịch vụ",
        onAction: () => handleCreateCarrier(),
        disabled: shipping.carrier_services.length ? true : false,
      }}
      // secondaryActions={[
      //   {
      //     content: "Cập nhật",
      //     helpText: "Cập nhật dịch vụ",
      //     onAction: () => handleUpdateCarrier(),
      //   },
      //   {
      //     content: "Xóa",
      //     helpText: "Xóa dịch vụ",
      //     onAction: () => handleDeleteCarrier(),
      //   },
      // ]}
    >
      <LegacyCard>
        <IndexTable
          itemCount={shippingData.length}
          headings={[
            { title: "Dịch vụ" },
            { title: "Trạng thái" },
            {
              title: "Hành động",
            },
          ]}
          hasMoreItems
          selectable={false}
        >
          {shippingData?.map(({ id, name, active }: any, index: number) => (
            <IndexTable.Row id={id} key={id} position={index}>
              <IndexTable.Cell>{name ?? ""}</IndexTable.Cell>

              <IndexTable.Cell>
                <Badge tone={active ? "success" : "critical"}>
                  {active ? "Hoạt động" : "Khóa"}
                </Badge>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateCarrier(id)}
                  >
                    Cập nhật
                  </Button>

                  <Button
                    variant="primary"
                    tone="critical"
                    onClick={() => handleDeleteCarrier(id)}
                  >
                    Xóa
                  </Button>
                </div>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </LegacyCard>
    </Page>
  );
}
