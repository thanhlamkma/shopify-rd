import type {
  DataFunctionArgs,
  LinksFunction,
  LoaderArgs,
} from "@remix-run/node";

import { json } from "@remix-run/node";
import {
  Form,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import type { IndexFiltersProps, TabProps } from "@shopify/polaris";
import {
  Badge,
  ChoiceList,
  Image,
  IndexFilters,
  IndexTable,
  LegacyCard,
  Page,
  RangeSlider,
  Text,
  TextField,
  Thumbnail,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import { ImageMajor } from "@shopify/polaris-icons";
import type { Status } from "@shopify/polaris/build/ts/src/components/Badge";
import { useCallback, useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import { fakeProductsData } from "../app.syncProducts/data";
import type { GetProductFilter } from "./models";
import { graphqlRequest } from "./repositories";
import { GET_PRODUCTS_QUERY } from "./request";
import productStyle from "./style.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: productStyle },
];

export const loader = async ({ request }: LoaderArgs) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const take = url.searchParams.get("take") ? url.searchParams.get("take") : 10;

  const productsData = await graphqlRequest(admin, GET_PRODUCTS_QUERY, {
    first: Number(take),
  });

  // const response = await admin.graphql(
  //   `#graphql
  //     query GetProducts($first: Int){
  //      products(first: $first) {
  //         edges {
  //           node {
  //             id
  //             title
  //             handle
  //             productType
  //             status
  //             mediaCount
  //             totalInventory
  //             vendor
  //             totalVariants
  //             featuredImage {
  //               url
  //             }
  //             resourcePublicationOnCurrentPublication {
  //               publication {
  //                 id
  //               }
  //               publishDate
  //               isPublished
  //             }
  //           }
  //         }
  //       }
  //     }`,
  //   {
  //     variables: {
  //       first: Number(take),
  //     },
  //   }
  // );

  // const responseJson = await response.json();

  return json({
    products:
      productsData?.data?.products?.edges.map((item: any) => item.node) ?? [],
    take,
  });
};

export const action = async ({ request }: DataFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const fileName = formData.get("fileName");

  // Upload file to Shopify
  const uploadFileResponse = await admin.graphql(
    `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
        }
      }
    `,
    {
      variables: {
        input: {
          resource: "BULK_MUTATION_VARIABLES",
          filename: fileName ?? "data.jsonl",
          mimeType: "text/jsonl",
          httpMethod: "POST",
        },
      },
    }
  );

  const uploadFileResponseJson = await uploadFileResponse.json();

  const jsonString = fakeProductsData
    .map((obj) => JSON.stringify(obj))
    .join("\n");
  const encoder = new TextEncoder();
  const blob = new Blob([encoder.encode(jsonString)], {
    type: "application/json",
  });

  const data = await uploadFileResponseJson?.data?.stagedUploadsCreate
    ?.stagedTargets[0];
  const formDataForSendFile = new FormData();
  const filePath = data.parameters.find(
    (item: any) => item.name === "key"
  ).value;
  data.parameters.forEach((item: any) => {
    if (item.name === "file") return;
    formDataForSendFile.append(item.name, item.value);
  });
  formDataForSendFile.append("file", blob, filePath);
  // formData.append("file", blob, fileInfo.fileName?.toString());

  await fetch(data.resourceUrl || data.url, {
    method: "POST",
    body: formDataForSendFile,
  });

  const bulkImportResponse = await admin.graphql(
    `#graphql
      mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
        bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
          bulkOperation {
            id
            url
            status
          }
          userErrors {
            field
            message
          }
        }
      }
      `,
    {
      variables: {
        mutation:
          "mutation call($input: ProductInput!) { productCreate(input: $input) { product {id title variants(first: 10) {edges {node {id title inventoryQuantity }}}} userErrors { message field } } }",
        stagedUploadPath: filePath,
      },
    }
  );

  const bulkImportResponseJson = await bulkImportResponse.json();

  if (
    bulkImportResponseJson?.data?.bulkOperationRunMutation?.bulkOperation
      ?.status === "CREATED"
  ) {
    const webhookSubscriptionResponse = await admin.graphql(
      `#graphql
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          userErrors {
            field
            message
          }
          webhookSubscription {
            id
          }
        }
      }
      `,
      {
        variables: {
          topic: "BULK_OPERATIONS_FINISH",
          webhookSubscription: {
            format: "JSON",
            callbackUrl: "https://google.com",
          },
        },
      }
    );

    const webhookSubscriptionResponseJson =
      await webhookSubscriptionResponse.json();

    // if (webhookSubscriptionResponseJson) {
    //   return redirect("/app/products");
    // }

    return webhookSubscriptionResponseJson;
  }

  return bulkImportResponseJson;
};

export default function Products() {
  const { products, take } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [searchParams, setSearchParams] = useSearchParams();

  // Variables
  const [filter, setFilter] = useState<GetProductFilter>(() => {
    const result = {} as GetProductFilter;

    result.take = Number(take ?? 10);
    result.skip = 0;

    return result;
  });

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  // Utilities
  const getStatus = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          color: "success",
          text: "Đang hoạt động",
        };
      case "DRAFT":
        return {
          color: "info",
          text: "Bản nháp",
        };
      case "ARCHIVE":
        return {
          color: "critical",
          text: "Đã lưu trữ",
        };
      default:
        return {
          color: "info",
          text: "",
        };
    }
  };

  // Actions
  const handleSync = () =>
    submit({ fileName: "data.jsonl" }, { replace: true, method: "POST" });

  // Effect
  useEffect(() => {
    setFilter((prevFilter) => ({ ...prevFilter, take: Number(take ?? 10) }));

    const params = new URLSearchParams();

    params.set("take", String(take));

    setSearchParams(params);
  }, [take]);

  return (
    <Page
      title="Sản phẩm"
      primaryAction={{
        content: "Đồng bộ sản phẩm",
        onAction: () => handleSync(),
      }}
      fullWidth
    >
      <div
        style={{
          marginBottom: "100px",
        }}
      >
        <Form
          id="search-form"
          role="search"
          style={{
            marginBottom: "20px",
          }}
          onChange={(event) => submit(event.currentTarget)}
        >
          <div className="input-container">
            <label htmlFor="take">Hiển thị</label>
            <input
              aria-label="Nhập số lượng"
              defaultValue={filter.take || 10}
              id="take"
              name="take"
              placeholder="Nhập số lượng"
              type="number"
            />
          </div>
        </Form>

        <LegacyCard>
          <HeaderFilter />

          <IndexTable
            itemCount={products.length}
            headings={[
              { title: "Sản phẩm" },
              { title: "Trạng thái" },
              // { title: "Hàng trong kho" },
              // { title: "Kênh bán hàng" },
              // { title: "Thị trường" },
              // { title: "Loại" },
              { title: "Nhà cung cấp" },
            ]}
            hasMoreItems
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
          >
            {products.map(
              (
                {
                  id,
                  title,
                  handle,
                  status,
                  mediaCount,
                  totalInventory,
                  vendor,
                  totalVariants,
                  featuredImage,
                }: any,
                index: number
              ) => (
                <IndexTable.Row
                  id={id}
                  key={id}
                  position={index}
                  selected={selectedResources.includes(id)}
                >
                  <IndexTable.Cell>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {featuredImage?.url ? (
                        <Image
                          source={featuredImage?.url}
                          alt={title}
                          width={50}
                          height={50}
                          style={{
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <Thumbnail
                          size="small"
                          alt="noImage"
                          source={ImageMajor}
                        />
                        // <ImageMajor />
                      )}

                      <Text variant="bodyMd" fontWeight="bold" as="span">
                        {title ?? ""}
                      </Text>
                    </div>
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    <Badge status={getStatus(status).color as Status}>
                      {getStatus(status).text}
                    </Badge>
                  </IndexTable.Cell>

                  <IndexTable.Cell>{handle ?? ""}</IndexTable.Cell>
                </IndexTable.Row>
              )
            )}
          </IndexTable>
        </LegacyCard>
      </div>
    </Page>
  );
}

const HeaderFilter = () => {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Usage
  const [itemStrings, setItemStrings] = useState([
    "Tất cả",
    "Đang hoạt động",
    "Bản nháp",
    "Đã lưu trữ",
  ]);

  const duplicateView = async (name: string) => {
    setItemStrings([...itemStrings, name]);
    setSelected(itemStrings.length);
    await sleep(1);
    return true;
  };

  const deleteView = (index: number) => {
    const newItemStrings = [...itemStrings];
    newItemStrings.splice(index, 1);
    setItemStrings(newItemStrings);
    setSelected(0);
  };

  const tabs: TabProps[] = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => {},
    id: `${item}-${index}`,
    isLocked: index === 0,
    actions:
      index === 0
        ? []
        : index < 3
        ? [
            {
              type: "duplicate",
              content: "Sao chép chế độ xem",
              onPrimaryAction: async (value: string): Promise<boolean> => {
                await sleep(1);
                duplicateView(value);
                return true;
              },
            },
          ]
        : [
            {
              type: "duplicate",
              content: "Sao chép chế độ xem",
              onPrimaryAction: async (value: string): Promise<boolean> => {
                await sleep(1);
                duplicateView(value);
                return true;
              },
            },
            {
              type: "delete",
              content: "Xóa chế độ xem",
              onPrimaryAction: async () => {
                await sleep(1);
                deleteView(index);
                return true;
              },
            },
          ],
  }));

  const sortOptions: IndexFiltersProps["sortOptions"] = [
    { label: "Đơn hàng", value: "order asc", directionLabel: "Cũ nhất trước" },
    {
      label: "Đơn hàng",
      value: "order desc",
      directionLabel: "Mới nhất trước",
    },
    { label: "Khách hàng", value: "customer asc", directionLabel: "A-Z" },
    { label: "Khách hàng", value: "customer desc", directionLabel: "Z-A" },
    { label: "Ngày tạo", value: "date asc", directionLabel: "A-Z" },
    { label: "Ngày tạo", value: "date desc", directionLabel: "Z-A" },
    {
      label: "Tổng tiền",
      value: "total asc",
      directionLabel: "Từ thấp nhất đến cao nhất",
    },
    {
      label: "Tổng tiền",
      value: "total desc",
      directionLabel: "Từ cao nhất đến thấp nhất",
    },
  ];
  const [sortSelected, setSortSelected] = useState(["order asc"]);

  const onCreateNewView = async (value: string) => {
    await sleep(500);
    setItemStrings([...itemStrings, value]);
    setSelected(itemStrings.length);
    return true;
  };
  // Don't use
  const [selected, setSelected] = useState(0);
  const { mode, setMode } = useSetIndexFiltersMode();
  const onHandleCancel = () => {};

  const onHandleSave = async () => {
    await sleep(1);
    return true;
  };

  const primaryAction: IndexFiltersProps["primaryAction"] =
    selected === 0
      ? {
          type: "save-as",
          onAction: onCreateNewView,
          disabled: false,
          loading: false,
        }
      : {
          type: "save",
          onAction: onHandleSave,
          disabled: false,
          loading: false,
        };
  const [accountStatus, setAccountStatus] = useState<string[] | undefined>(
    undefined
  );
  const [moneySpent, setMoneySpent] = useState<[number, number] | undefined>(
    undefined
  );
  const [taggedWith, setTaggedWith] = useState("");
  const [queryValue, setQueryValue] = useState("");

  const handleAccountStatusChange = useCallback(
    (value: string[]) => setAccountStatus(value),
    []
  );
  const handleMoneySpentChange = useCallback(
    (value: [number, number]) => setMoneySpent(value),
    []
  );
  const handleTaggedWithChange = useCallback(
    (value: string) => setTaggedWith(value),
    []
  );
  const handleFiltersQueryChange = useCallback(
    (value: string) => setQueryValue(value),
    []
  );
  const handleAccountStatusRemove = useCallback(
    () => setAccountStatus(undefined),
    []
  );
  const handleMoneySpentRemove = useCallback(
    () => setMoneySpent(undefined),
    []
  );
  const handleTaggedWithRemove = useCallback(() => setTaggedWith(""), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleFiltersClearAll = useCallback(() => {
    handleAccountStatusRemove();
    handleMoneySpentRemove();
    handleTaggedWithRemove();
    handleQueryValueRemove();
  }, [
    handleAccountStatusRemove,
    handleMoneySpentRemove,
    handleQueryValueRemove,
    handleTaggedWithRemove,
  ]);

  const filters = [
    {
      key: "accountStatus",
      label: "Account status",
      filter: (
        <ChoiceList
          title="Account status"
          titleHidden
          choices={[
            { label: "Enabled", value: "enabled" },
            { label: "Not invited", value: "not invited" },
            { label: "Invited", value: "invited" },
            { label: "Declined", value: "declined" },
          ]}
          selected={accountStatus || []}
          onChange={handleAccountStatusChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: "taggedWith",
      label: "Tagged with",
      filter: (
        <TextField
          label="Tagged with"
          value={taggedWith}
          onChange={handleTaggedWithChange}
          autoComplete="off"
          labelHidden
        />
      ),
      shortcut: true,
    },
    {
      key: "moneySpent",
      label: "Money spent",
      filter: (
        <RangeSlider
          label="Money spent is between"
          labelHidden
          value={moneySpent || [0, 500]}
          prefix="$"
          output
          min={0}
          max={2000}
          step={1}
          onChange={handleMoneySpentChange}
        />
      ),
    },
  ];

  function isEmpty(value: string | any[]) {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === "" || value == null;
    }
  }

  function disambiguateLabel(key: string, value: string | any[]): string {
    switch (key) {
      case "moneySpent":
        return `Money spent is between $${value[0]} and $${value[1]}`;
      case "taggedWith":
        return `Tagged with ${value}`;
      case "accountStatus":
        return (value as string[]).map((val) => `Customer ${val}`).join(", ");
      default:
        return value as string;
    }
  }

  const appliedFilters: IndexFiltersProps["appliedFilters"] = [];
  if (accountStatus && !isEmpty(accountStatus)) {
    const key = "accountStatus";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, accountStatus),
      onRemove: handleAccountStatusRemove,
    });
  }
  if (moneySpent) {
    const key = "moneySpent";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, moneySpent),
      onRemove: handleMoneySpentRemove,
    });
  }
  if (!isEmpty(taggedWith)) {
    const key = "taggedWith";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, taggedWith),
      onRemove: handleTaggedWithRemove,
    });
  }

  return (
    <IndexFilters
      sortOptions={sortOptions}
      sortSelected={sortSelected}
      queryValue={queryValue}
      queryPlaceholder="Tìm kiếm"
      onQueryChange={handleFiltersQueryChange}
      onQueryClear={() => {}}
      onSort={setSortSelected}
      primaryAction={primaryAction}
      cancelAction={{
        onAction: onHandleCancel,
        disabled: false,
        loading: false,
      }}
      tabs={tabs}
      selected={selected}
      onSelect={setSelected}
      canCreateNewView
      onCreateNewView={onCreateNewView}
      filters={filters}
      appliedFilters={appliedFilters}
      onClearAll={handleFiltersClearAll}
      mode={mode}
      setMode={setMode}
    />
  );
};
