import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, Layout, Card, BlockStack, Text, Button } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);

  const currentScopes = session.scope?.split(",") || [];
  const requiredScopes = [
    "read_inventory",
    "write_products",
    "read_products",
    "write_inventory",
  ];

  const missingScopes = requiredScopes.filter(
    (scope) => !currentScopes.includes(scope)
  );

  // Generate the OAuth URL to request new scopes
  const shop = session.shop;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth/callback`;
  const scopes = requiredScopes.join(",");

  const oauthUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`;

  return {
    currentScopes,
    requiredScopes,
    missingScopes,
    oauthUrl,
  };
};

export default function RequestScopes() {
  const { currentScopes, requiredScopes, missingScopes, oauthUrl } =
    useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Request Missing Scopes" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Current Scopes
              </Text>
              <BlockStack gap="200">
                {currentScopes.map((scope) => (
                  <Text key={scope} as="p" variant="bodyMd">
                    ✅ {scope}
                  </Text>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Required Scopes
              </Text>
              <BlockStack gap="200">
                {requiredScopes.map((scope) => (
                  <Text
                    key={scope}
                    as="p"
                    variant="bodyMd"
                    tone={
                      currentScopes.includes(scope) ? "success" : "critical"
                    }
                  >
                    {currentScopes.includes(scope) ? "✅" : "❌"} {scope}
                  </Text>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {missingScopes.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Missing Scopes
                </Text>
                <Text as="p" variant="bodyMd" tone="critical">
                  Your app is missing the following required scopes:
                </Text>
                <BlockStack gap="200">
                  {missingScopes.map((scope) => (
                    <Text key={scope} as="p" variant="bodyMd">
                      ❌ {scope}
                    </Text>
                  ))}
                </BlockStack>
                <Button
                  variant="primary"
                  url={oauthUrl}
                  external
                  target="_top"
                >
                  Request Missing Scopes
                </Button>
                <Text as="p" variant="bodySm" tone="subdued">
                  Clicking this button will redirect you to approve the new
                  scopes. You'll be redirected back to the app after approval.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {missingScopes.length === 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  ✅ All Scopes Granted
                </Text>
                <Text as="p" variant="bodyMd">
                  Your app has all the required scopes!
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
