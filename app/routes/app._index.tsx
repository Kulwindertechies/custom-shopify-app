import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Icon,
} from "@shopify/polaris";
import {
  EmailIcon,
  NotificationIcon,
  OrderIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  // Get Back in Stock settings
  const backInStockSettings = await db.backInStockSettings.findUnique({
    where: { shop },
  });

  // Fetch data from backend API
  let totalSubscriptions = 0;
  let activeSubscriptions = 0;
  let notificationsSent = 0;

  try {
    const backendUrl = new URL(
      "https://54dde34a56da.ngrok-free.app/api/backInStock"
    );
    backendUrl.searchParams.append("shop", shop);

    const backendResponse = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log("Backend API response:", backendData);

      totalSubscriptions = backendData.total || 0;
      activeSubscriptions = backendData.active || 0;
      notificationsSent = backendData.sent || 0;
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

  return {
    backInStock: {
      enabled: backInStockSettings?.enabled || false,
      totalSubscriptions: totalSubscriptions,
      activeSubscriptions: activeSubscriptions,
    },
    analytics: {
      signups: totalSubscriptions,
      notificationsSent: notificationsSent,
      activeSubscriptions: activeSubscriptions,
    },
  };
};

export default function Index() {
  const { backInStock, analytics } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingLg">
                  Welcome to Stockpilot
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Manage your inventory notifications and customer engagement
                  features from one place.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Features Overview
                </Text>
                <InlineStack gap="400" wrap={false}>
                  <Link
                    to="/app/backinstock"
                    style={{ textDecoration: "none", flex: 1 }}
                  >
                    <div
                      style={{
                        transition: "transform 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.02)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="200" blockAlign="center">
                              <Icon source={EmailIcon} tone="base" />
                              <Text as="p" variant="bodySm" tone="subdued">
                                Back in Stock
                              </Text>
                            </InlineStack>
                            <Badge
                              tone={backInStock.enabled ? "success" : "critical"}
                            >
                              {backInStock.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </InlineStack>
                          <Text as="p" variant="heading2xl">
                            {backInStock.totalSubscriptions}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Total subscriptions
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                  </Link>

                  <Link
                    to="/app/preorder"
                    style={{ textDecoration: "none", flex: 1 }}
                  >
                    <div
                      style={{
                        transition: "transform 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.02)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="200" blockAlign="center">
                              <Icon source={NotificationIcon} tone="base" />
                              <Text as="p" variant="bodySm" tone="subdued">
                                Pre-order
                              </Text>
                            </InlineStack>
                            <Badge tone="info">Coming Soon</Badge>
                          </InlineStack>
                          <Text as="p" variant="heading2xl">
                            -
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Total pre-orders
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                  </Link>

                  <Link
                    to="/app/waitlist"
                    style={{ textDecoration: "none", flex: 1 }}
                  >
                    <div
                      style={{
                        transition: "transform 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.02)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="200" blockAlign="center">
                              <Icon source={OrderIcon} tone="base" />
                              <Text as="p" variant="bodySm" tone="subdued">
                                Waitlist
                              </Text>
                            </InlineStack>
                            <Badge tone="info">Coming Soon</Badge>
                          </InlineStack>
                          <Text as="p" variant="heading2xl">
                            -
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Total waitlists
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                  </Link>
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
                  Back in Stock Analytics
                </Text>
                <InlineStack gap="400" wrap={false}>
                  <div
                    style={{
                      flex: 1,
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.02)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    <Card>
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="200" blockAlign="center">
                            <Icon source={EmailIcon} tone="base" />
                            <Text as="p" variant="bodySm" tone="subdued">
                              Signups
                            </Text>
                          </InlineStack>
                          <Link to="/app/backinstock?tab=signups">
                            <Button size="micro">View Details</Button>
                          </Link>
                        </InlineStack>
                        <Text as="p" variant="heading2xl">
                          {analytics.signups}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Total customer subscriptions
                        </Text>
                      </BlockStack>
                    </Card>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.02)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    <Card>
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="200" blockAlign="center">
                            <Icon source={NotificationIcon} tone="base" />
                            <Text as="p" variant="bodySm" tone="subdued">
                              Notifications Sent
                            </Text>
                          </InlineStack>
                          <Link to="/app/backinstock?tab=notifications">
                            <Button size="micro">View Details</Button>
                          </Link>
                        </InlineStack>
                        <Text as="p" variant="heading2xl">
                          {analytics.notificationsSent}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Emails sent to customers
                        </Text>
                      </BlockStack>
                    </Card>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.02)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    <Card>
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="200" blockAlign="center">
                            <Icon source={OrderIcon} tone="base" />
                            <Text as="p" variant="bodySm" tone="subdued">
                              Active Subscriptions
                            </Text>
                          </InlineStack>
                          <Link to="/app/backinstock?tab=active">
                            <Button size="micro">View Details</Button>
                          </Link>
                        </InlineStack>
                        <Text as="p" variant="heading2xl">
                          {analytics.activeSubscriptions}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Emails to be sent
                        </Text>
                      </BlockStack>
                    </Card>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}