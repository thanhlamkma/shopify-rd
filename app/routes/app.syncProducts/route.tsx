import {
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  type DataFunctionArgs,
} from "@remix-run/node";
import { Form, useSubmit } from "@remix-run/react";
import {
  Button,
  DropZone,
  LegacyStack,
  Page,
  Text,
  Thumbnail,
} from "@shopify/polaris";
import { NoteMinor } from "@shopify/polaris-icons";
import { useCallback, useState } from "react";
import { authenticate } from "~/shopify.server";
import { fakeProductsData } from "./data";

export const action = async ({ request }: DataFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // let uploadHandler = async ({
  //   name,
  //   filename,
  //   contentType,
  // }: MemoryUploadHandlerFilterArgs) => {
  //   console.log("in uploadHandler", contentType);

  //   if (name !== "file") {
  //     return;
  //   } else {
  //     console.log(name, filename);
  //   }

  //   return filename;
  // };

  const uploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, contentType, data, filename }) => {
      if (name !== "file") {
        return undefined;
      }
      return filename;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  // get file info back after image upload
  const form = await unstable_parseMultipartFormData(request, uploadHandler);
  const fileInfo = { fileName: form.get("file") };

  console.log("fileInfo", fileInfo);

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
          filename: fileInfo.fileName,
          mimeType: "text/jsonl",
          httpMethod: "POST",
        },
      },
    }
  );

  const uploadFileResponseJson = await uploadFileResponse.json();

  if (!uploadFileResponseJson) {
    throw new Response("Error: Upload fail");
  }

  const jsonString = fakeProductsData
    .map((obj) => JSON.stringify(obj))
    .join("\n");
  const encoder = new TextEncoder();
  const blob = new Blob([encoder.encode(jsonString)], {
    type: "application/json",
  });

  const data = await uploadFileResponseJson?.data?.stagedUploadsCreate
    ?.stagedTargets[0];
  const formData = new FormData();
  const filePath = data.parameters.find(
    (item: any) => item.name === "key"
  ).value;
  data.parameters.forEach((item: any) => {
    if (item.name === "file") return;
    formData.append(item.name, item.value);
  });
  formData.append("file", blob, filePath);
  // formData.append("file", blob, fileInfo.fileName?.toString());

  await fetch(data.resourceUrl || data.url, {
    method: "POST",
    body: formData,
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
  console.log("bulkImportResponseJson:", bulkImportResponseJson);

  if (!bulkImportResponseJson) {
    throw new Response("Error: Cannot bulk import");
  }

  return bulkImportResponseJson;
  // return await redirect("/app/products?q=10");
};

export default function Products() {
  const [file, setFile] = useState<File>();
  // const { uploadFileResponse, bulkImportResponse } = useActionData();
  const submit = useSubmit();

  // useEffect(() => {
  //   console.log("fileResponse", bulkImportResponse);
  // }, [bulkImportResponse]);

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
      console.log("acceptedFiles", acceptedFiles);
      setFile(acceptedFiles[0]);
    },
    []
  );

  const validImageTypes = [
    "image/gif",
    "image/jpeg",
    "image/png",
    "application/json",
  ];

  const fileUpload = !file && <DropZone.FileUpload />;
  const uploadedFiles = file && (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LegacyStack vertical>
        <LegacyStack alignment="center">
          {file.type !== "application/json" ? (
            <Thumbnail
              size="small"
              alt={file.name}
              source={
                validImageTypes.includes(file.type)
                  ? window.URL.createObjectURL(file)
                  : NoteMinor
              }
            />
          ) : (
            <></>
          )}

          <div>
            {file.name}{" "}
            <Text variant="bodySm" as="p">
              {file.size} bytes
            </Text>
          </div>
        </LegacyStack>
      </LegacyStack>
    </div>
  );

  const handleSync = () =>
    submit(
      { file: file?.name ?? "data.jsonl" },
      { replace: true, method: "POST" }
    );

  return (
    <Page title="Synchronous products">
      <DropZone onDrop={handleDropZoneDrop} allowMultiple={false}>
        {uploadedFiles}
        {fileUpload}
      </DropZone>

      <div
        style={{
          marginTop: "10px",
          textAlign: "right",
        }}
      >
        <Button submit primary onClick={handleSync}>
          Sync Products
        </Button>
      </div>

      <div>
        <Form method="post" encType="multipart/form-data">
          <input type="file" id="my-file" name="file" />
          <Button submit primary>
            Sync Products
          </Button>
        </Form>
      </div>
    </Page>
  );
}
