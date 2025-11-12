import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useSearchParams,
  useNavigate,
} from "@remix-run/react";
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
  Icon,
  Tabs,
} from "@shopify/polaris";
import {
  EmailIcon,
  NotificationIcon,
  OrderIcon,
} from "@shopify/polaris-icons";
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

  // Fetch data from backend API
  let backendData = null;
  let totalSubscriptions = 0;
  let activeSubscriptions = 0;
  let notificationsSent = 0;
  let recentSubscriptions: any[] = [];
  let productStats: any[] = [];

  try {
    const backendUrl = new URL(
      "https://54dde34a56da.ngrok-free.app/api/backInStock"
    );
    backendUrl.searchParams.append("shop", shop);

    const backendResponse = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true", // Skip ngrok browser warning
      },
    });

    if (backendResponse.ok) {
      backendData = await backendResponse.json();
      console.log("Backend API response:", backendData);

      // Map backend data to our format
      totalSubscriptions = backendData.total || 0;
      activeSubscriptions = backendData.active || 0;
      notificationsSent = backendData.sent || 0;

      // Map recent subscriptions from backend
      recentSubscriptions = (backendData.recentSubscriptions || []).map(
        (sub: any) => ({
          id: sub.id,
          email: sub.email,
          productId: sub.product_id,
          variantId: sub.variant_id,
          quantity: sub.quantity || 1,
          notified: sub.notified,
          notifiedAt: sub.notified_at,
          createdAt: sub.createdAt,
          title: sub.title || "",
        })
      );

      // Group by product_id for product stats
      const productMap = new Map();
      (backendData.recentSubscriptions || []).forEach((sub: any) => {
        const count = productMap.get(sub.product_id) || 0;
        productMap.set(sub.product_id, count + 1);
      });

      productStats = Array.from(productMap.entries())
        .map(([productId, count]) => ({
          productId,
          _count: { productId: count },
        }))
        .sort((a, b) => b._count.productId - a._count.productId)
        .slice(0, 5);
    } else {
      console.error(
        "Backend API error:",
        backendResponse.status,
        backendResponse.statusText
      );
    }
  } catch (error) {
    console.error("Error fetching from backend API:", error);
  }

  // Analytics data
  const analytics = {
    signups: totalSubscriptions,
    notificationsSent: notificationsSent,
    activeSubscriptions: activeSubscriptions,
  };

  return {
    settings,
    stats: {
      totalSubscriptions,
      activeSubscriptions,
      notificationsSent,
    },
    analytics,
    recentSubscriptions,
    productStats,
    backendData,
  };
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

    return { success: true };
  }

  return { success: false };
};

export default function BackInStock() {
  const {
    settings,
    stats,
    analytics,
    recentSubscriptions,
    productStats,
    backendData,
  } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const isLoading = nav.state === "submitting";

  // Check URL parameters for tab selection
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const getTabIndex = (tab: string | null) => {
    switch (tab) {
      case "signups":
        return 0;
      case "notifications":
        return 1;
      case "active":
        return 2;
      default:
        return 0;
    }
  };

  const [selectedTab, setSelectedTab] = useState(getTabIndex(tabParam));

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
    sub.title || sub.productId,
    sub.variantId || "All variants",
    sub.quantity || 1,
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
            <InlineStack align="space-between">
              <Button onClick={() => navigate("/app")}>
                ← Back to Dashboard
              </Button>
            </InlineStack>
          </Layout.Section>
        </Layout>

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
                      Status:{" "}
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
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Analytics Details
                </Text>

                  <Tabs
                    tabs={[
                      {
                        id: "signups",
                        content: "Signups",
                        accessibilityLabel: "All signups",
                      },
                      {
                        id: "notifications",
                        content: "Notifications Sent",
                        accessibilityLabel: "Notifications sent",
                      },
                      {
                        id: "active",
                        content: "Active Subscriptions",
                        accessibilityLabel: "Active subscriptions",
                      },
                    ]}
                    selected={selectedTab}
                    onSelect={setSelectedTab}
                  />

                  <Box paddingBlockStart="400">
                    {selectedTab === 0 && (
                      <BlockStack gap="400">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          View all customer signups and subscription details.
                        </Text>
                        <DataTable
                          columnContentTypes={[
                            "text",
                            "text",
                            "text",
                            "numeric",
                            "text",
                            "text",
                          ]}
                          headings={[
                            "Email",
                            "Product ID",
                            "Variant",
                            "Qty",
                            "Status",
                            "Date",
                          ]}
                          rows={recentSubscriptionsRows}
                        />
                      </BlockStack>
                    )}

                    {selectedTab === 1 && (
                      <BlockStack gap="400">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Track all notifications sent to customers when
                          products are back in stock.
                        </Text>
                        <DataTable
                          columnContentTypes={[
                            "text",
                            "text",
                            "text",
                            "numeric",
                            "text",
                            "text",
                          ]}
                          headings={[
                            "Email",
                            "Product ID",
                            "Variant",
                            "Qty",
                            "Status",
                            "Date",
                          ]}
                          rows={recentSubscriptions
                            .filter((sub) => sub.notified)
                            .map((sub) => [
                              sub.email,
                              sub.title || sub.productId,
                              sub.variantId || "All variants",
                              sub.quantity || 1,
                              <Badge tone="success">Notified</Badge>,
                              new Date(sub.createdAt).toLocaleDateString(),
                            ])}
                        />
                      </BlockStack>
                    )}

                    {selectedTab === 2 && (
                      <BlockStack gap="400">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          View active subscriptions waiting for products to be
                          back in stock. These customers will receive emails
                          when inventory is available.
                        </Text>
                        <DataTable
                          columnContentTypes={[
                            "text",
                            "text",
                            "text",
                            "numeric",
                            "text",
                            "text",
                          ]}
                          headings={[
                            "Email",
                            "Product ID",
                            "Variant",
                            "Qty",
                            "Status",
                            "Date",
                          ]}
                          rows={recentSubscriptions
                            .filter((sub) => !sub.notified)
                            .map((sub) => [
                              sub.email,
                              sub.title || sub.productId,
                              sub.variantId || "All variants",
                              sub.quantity || 1,
                              <Badge tone="attention">Waiting</Badge>,
                              new Date(sub.createdAt).toLocaleDateString(),
                            ])}
                        />
                      </BlockStack>
                    )}
                  </Box>
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
                    columnContentTypes={[
                      "text",
                      "text",
                      "text",
                      "numeric",
                      "text",
                      "text",
                    ]}
                    headings={[
                      "Email",
                      "Product",
                      "Variant",
                      "Qty",
                      "Status",
                      "Date",
                    ]}
                    rows={recentSubscriptionsRows}
                  />
                ) : (
                  <EmptyState
                    heading="No subscriptions yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      Customers will appear here when they subscribe for
                      back-in-stock notifications.
                    </p>
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
                    <p>
                      Popular products will appear here based on subscription
                      requests.
                    </p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {backendData && (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Backend API Data
                  </Text>
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: "16px",
                      borderRadius: "8px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      whiteSpace: "pre-wrap",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(backendData, null, 2)}
                  </div>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
