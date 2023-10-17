const GET_PRODUCTS_QUERY = `#graphql
      query GetProducts($first: Int){
       products(first: $first) {
          edges {
            node {
              id
              title
              handle
              productType
              status
              mediaCount
              totalInventory
              vendor
              totalVariants
              featuredImage {
                url
              }
              resourcePublicationOnCurrentPublication {
                publication {
                  id
                }
                publishDate
                isPublished
              }
            }
          }
        }
      }`;

const STAGED_UPLOADS_MUTATION = `#graphql
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
    `;

const BULK_IMPORT_MUTATION = `#graphql
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
      `;

const WEBHOOK_SUBSCRIPTION_CREATE = `#graphql
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
      `;

export {
  BULK_IMPORT_MUTATION,
  GET_PRODUCTS_QUERY,
  STAGED_UPLOADS_MUTATION,
  WEBHOOK_SUBSCRIPTION_CREATE,
};
