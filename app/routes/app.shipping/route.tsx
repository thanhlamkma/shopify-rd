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

  if (request.method === "POST") {
    const response = await handleCreateRequest(admin, request);

    return response;
  } else if (request.method === "PUT") {
    const carrierId = await formData.get("carrierId");
    const response = await handleUpdateRequest(
      admin,
      carrierId?.toString() ?? "",
      request
    );

    return response;
  } else {
    const carrierId = await formData.get("carrierId");
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
          callback_url:
            "https://smart-phone-vn.myshopify.com/admin/apps/test-ecom-4/api/shipping",
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
          callback_url:
            "https://smart-phone-vn.myshopify.com/admin/apps/test-ecom-4/api/shipping",
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

  const handleUpdateCarrier = () =>
    submit(
      { carrierId: shippingData[0]?.id },
      { method: "PUT", replace: true }
    );

  const handleDeleteCarrier = () =>
    submit(
      { carrierId: shippingData[0]?.id },
      { method: "DELETE", replace: true }
    );

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
                <Badge status={active ? "success" : "critical"}>
                  {active ? "Hoạt động" : "Khóa"}
                </Badge>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Button
                    variant="primary"
                    onClick={() => handleDeleteCarrier()}
                  >
                    Xóa
                  </Button>

                  <Button
                    variant="primary"
                    tone="critical"
                    onClick={() => handleDeleteCarrier()}
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
