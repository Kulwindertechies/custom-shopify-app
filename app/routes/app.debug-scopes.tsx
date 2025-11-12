import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, List } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  // Get current scopes
  const scopes = session.scope?.split(",") || [];

  // Test a simple query to check permissions
  let canAccessInventory = false;
  let canAccessProducts = false;
  let errorMessage = null;

  let inventoryItemTest: string | null = null;
  let productVariantTest: string | null = null;

  try {
    // Test inventory access
    const inventoryResponse = await admin.graphql(`
      query {
        inventoryItems(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    `);
    const inventoryData: any = await inventoryResponse.json();
    canAccessInventory = !inventoryData.errors;
    if (inventoryData.errors) {
      inventoryItemTest = JSON.stringify(inventoryData.errors, null, 2);
    }

    // Test product access with variant and inventory item
    const productResponse = await admin.graphql(`
      query {
        products(first: 1) {
          edges {
            node {
              id
              title
              variants(first: 1) {
                edges {
                  node {
                    id
                    inventoryItem {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
    const productData: any = await productResponse.json();
    canAccessProducts = !productData.errors;
    if (productData.errors) {
      productVariantTest = JSON.stringify(productData.errors, null, 2);
    } else if (productData.data?.products?.edges?.[0]) {
      const product = productData.data.products.edges[0].node;
      const variant = product.variants?.edges?.[0]?.node;
      productVariantTest = JSON.stringify(
        {
          productId: product.id,
          variantId: variant?.id,
          inventoryItemId: variant?.inventoryItem?.id,
        },
        null,
        2
      );
    }
  } catch (error: any) {
    errorMessage = error.message;
  }

  return {
    shop: session.shop,
    scopes,
    canAccessInventory,
    canAccessProducts,
    errorMessage,
    inventoryItemTest,
    productVariantTest,
    accessToken: session.accessToken
      ? session.accessToken.substring(0, 20) + "..."
      : "No token", // Show partial token
  };
};

export default function DebugScopes() {
  const {
    shop,
    scopes,
    canAccessInventory,
    canAccessProducts,
    errorMessage,
    inventoryItemTest,
    productVariantTest,
    accessToken,
  } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Debug: API Scopes" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Current Shop
              </Text>
              <Text as="p" variant="bodyMd">
                {shop}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Granted Scopes
              </Text>
              {scopes.length > 0 ? (
                <List>
                  {scopes.map((scope) => (
                    <List.Item key={scope}>{scope}</List.Item>
                  ))}
                </List>
              ) : (
                <Text as="p" variant="bodyMd" tone="critical">
                  No scopes found!
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Permission Tests
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>Can Access Inventory:</strong>{" "}
                  {canAccessInventory ? "✅ Yes" : "❌ No"}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Can Access Products:</strong>{" "}
                  {canAccessProducts ? "✅ Yes" : "❌ No"}
                </Text>
                {errorMessage && (
                  <Text as="p" variant="bodyMd" tone="critical">
                    <strong>Error:</strong> {errorMessage}
                  </Text>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Required Scopes for Your App
              </Text>
              <List>
                <List.Item>read_products - Read product data</List.Item>
                <List.Item>write_products - Create/update products</List.Item>
                <List.Item>read_inventory - Read inventory levels</List.Item>
                <List.Item>write_inventory - Update inventory levels</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Inventory Item Test
              </Text>
              {inventoryItemTest ? (
                <div
                  style={{
                    background: "#f9fafb",
                    padding: "12px",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {inventoryItemTest}
                </div>
              ) : (
                <Text as="p" variant="bodyMd" tone="success">
                  ✅ Can access inventory items
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Product Variant → Inventory Item Test
              </Text>
              {productVariantTest && (
                <div
                  style={{
                    background: "#f9fafb",
                    padding: "12px",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {productVariantTest}
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Access Token Info
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Token (partial): {accessToken}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                This token is used for API calls from this Shopify app. Your
                backend needs its own token.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                For Backend API Calls (401 Error Fix)
              </Text>
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">
                  If you're getting 401 errors from your backend server, you
                  need to:
                </Text>
                <List type="number">
                  <List.Item>
                    <strong>Create a Custom App</strong> in your store (not this
                    embedded app)
                  </List.Item>
                  <List.Item>
                    Go to: Settings → Apps and sales channels → Develop apps →
                    Create an app
                  </List.Item>
                  <List.Item>
                    Configure API scopes: read_products, write_products,
                    read_inventory, write_inventory
                  </List.Item>
                  <List.Item>Install the custom app and get the Admin API access token</List.Item>
                  <List.Item>
                    Use that token in your backend for GraphQL/REST API calls
                  </List.Item>
                </List>
                <Text as="p" variant="bodySm" tone="critical">
                  ⚠️ Embedded app tokens (like this one) cannot be used from
                  external servers. You need a separate custom app token.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                How to Fix Missing Scopes (This App)
              </Text>
              <List type="number">
                <List.Item>
                  Uninstall the app from Settings → Apps and sales channels
                </List.Item>
                <List.Item>Stop the dev server (Ctrl+C)</List.Item>
                <List.Item>Run: npm run dev</List.Item>
                <List.Item>
                  Click the preview URL to reinstall with new scopes
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
