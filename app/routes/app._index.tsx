import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Badge,
  DataTable,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  // Get or create settings
  let settings = await db.backInStockSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    settings = await db.backInStockSettings.create({
      data: { shop },
    });
  }

  // Get subscription stats
  const totalSubscriptions = await db.backInStockSubscription.count({
    where: { shop },
  });

  const activeSubscriptions = await db.backInStockSubscription.count({
    where: { shop, notified: false },
  });

  const notificationsSent = await db.backInStockNotification.count({
    where: { shop, status: 'sent' },
  });

  // Get recent subscriptions with product data
  const recentSubscriptions = await db.backInStockSubscription.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Get most requested products
  const productStats = await db.backInStockSubscription.groupBy({
    by: ['productId'],
    where: { shop },
    _count: { productId: true },
    orderBy: { _count: { productId: 'desc' } },
    take: 5,
  });

  return json({
    settings,
    stats: {
      totalSubscriptions,
      activeSubscriptions,
      notificationsSent,
    },
    recentSubscriptions,
    productStats,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "toggle_enabled") {
    const settings = await db.backInStockSettings.findUnique({
      where: { shop },
    });

    await db.backInStockSettings.update({
      where: { shop },
      data: { enabled: !settings?.enabled },
    });

    return json({ success: true });
  }

  return json({ success: false });
};

export default function Index() {
  const { settings, stats, recentSubscriptions, productStats } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const isLoading = nav.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Settings updated successfully");
    }
  }, [actionData, shopify]);

  const toggleEnabled = () => {
    submit({ action: "toggle_enabled" }, { method: "POST" });
  };

  const recentSubscriptionsRows = recentSubscriptions.map((sub) => [
    sub.email,
    sub.productId,
    sub.variantId || "All variants",
    sub.notified ? (
      <Badge tone="success">Notified</Badge>
    ) : (
      <Badge tone="attention">Waiting</Badge>
    ),
    new Date(sub.createdAt).toLocaleDateString(),
  ]);

  const productStatsRows = productStats.map((stat) => [
    stat.productId,
    stat._count.productId.toString(),
  ]);

  return (
    <Page>
      <TitleBar title="Back in Stock Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Back in Stock Settings
                  </Text>
                  <Button
                    onClick={toggleEnabled}
                    loading={isLoading}
                    tone={settings.enabled ? "critical" : "success"}
                  >
                    {settings.enabled ? "Disable" : "Enable"} Feature
                  </Button>
                </InlineStack>
                <InlineStack gap="400">
                  <Box>
                    <Text as="p" variant="bodyMd">
                      Status: {" "}
                      <Badge tone={settings.enabled ? "success" : "critical"}>
                        {settings.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </Text>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Total Subscriptions
                </Text>
                <Text as="p" variant="headingLg">
                  {stats.totalSubscriptions}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Active Subscriptions
                </Text>
                <Text as="p" variant="headingLg">
                  {stats.activeSubscriptions}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Notifications Sent
                </Text>
                <Text as="p" variant="headingLg">
                  {stats.notificationsSent}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Recent Subscriptions
                </Text>
                {recentSubscriptions.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text"]}
                    headings={["Email", "Product ID", "Variant", "Status", "Date"]}
                    rows={recentSubscriptionsRows}
                  />
                ) : (
                  <EmptyState
                    heading="No subscriptions yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Customers will appear here when they subscribe for back-in-stock notifications.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Most Requested Products
                </Text>
                {productStats.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "numeric"]}
                    headings={["Product ID", "Subscriptions"]}
                    rows={productStatsRows}
                  />
                ) : (
                  <EmptyState
                    heading="No product requests yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Popular products will appear here based on subscription requests.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}