import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  DataTable,
  EmptyState,
  Badge,
  InlineStack,
  TextField,
  Select,
  Pagination,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;
  
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 25;
  const skip = (page - 1) * limit;
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "all";

  // Build where clause
  const where: any = { shop };
  
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { productId: { contains: search } },
    ];
  }
  
  if (status === "active") {
    where.notified = false;
  } else if (status === "notified") {
    where.notified = true;
  }

  // Get subscriptions with pagination
  const [subscriptions, totalCount] = await Promise.all([
    db.backInStockSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.backInStockSubscription.count({ where }),
  ]);

  // Get product details for the subscriptions
  const productIds = [...new Set(subscriptions.map(sub => sub.productId))];
  const productDetails: Record<string, any> = {};

  if (productIds.length > 0) {
    try {
      const productQuery = `
        query getProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              handle
              featuredImage {
                url
              }
            }
          }
        }
      `;

      const response = await admin.graphql(productQuery, {
        variables: {
          ids: productIds.map(id => `gid://shopify/Product/${id}`),
        },
      });

      const data = await response.json();
      if (data.data?.nodes) {
        data.data.nodes.forEach((product: any) => {
          if (product) {
            const id = product.id.replace('gid://shopify/Product/', '');
            productDetails[id] = product;
          }
        });
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  }

  const totalPages = Math.ceil(totalCount / limit);

  return {
    subscriptions,
    productDetails,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    filters: { search, status },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  
  const formData = await request.formData();
  const action = formData.get("action");
  const subscriptionId = formData.get("subscriptionId") as string;

  try {
    if (action === "delete") {
      await db.backInStockSubscription.delete({
        where: { id: subscriptionId, shop },
      });
      return { success: true, message: "Subscription deleted successfully" };
    }

    if (action === "mark_notified") {
      await db.backInStockSubscription.update({
        where: { id: subscriptionId, shop },
        data: { notified: true, notifiedAt: new Date() },
      });
      return { success: true, message: "Subscription marked as notified" };
    }

    return { success: false, message: "Invalid action" };
  } catch (error) {
    console.error("Error performing action:", error);
    return { success: false, message: "Failed to perform action" };
  }
};

export default function Subscriptions() {
  const { subscriptions, productDetails, pagination, filters } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isLoading = nav.state === "submitting";

  const handleDelete = (subscriptionId: string) => {
    setSelectedSubscription(subscriptionId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedSubscription) {
      submit(
        { action: "delete", subscriptionId: selectedSubscription },
        { method: "POST" }
      );
    }
    setShowDeleteModal(false);
    setSelectedSubscription(null);
  };

  const markAsNotified = (subscriptionId: string) => {
    submit(
      { action: "mark_notified", subscriptionId },
      { method: "POST" }
    );
  };

  const handleSearch = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("search", value);
    if (filters.status !== "all") params.set("status", filters.status);
    params.set("page", "1");
    
    const url = params.toString() ? `?${params.toString()}` : "";
    window.location.href = `/app/subscriptions${url}`;
  };

  const handleStatusFilter = (value: string) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (value !== "all") params.set("status", value);
    params.set("page", "1");
    
    const url = params.toString() ? `?${params.toString()}` : "";
    window.location.href = `/app/subscriptions${url}`;
  };

  const rows = subscriptions.map((subscription: any) => {
    const product = productDetails[subscription.productId];
    return [
      subscription.email,
      product ? (
        <InlineStack gap="200">
          {product.featuredImage && (
            <img 
              src={product.featuredImage.url} 
              alt={product.title}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <Text as="span" variant="bodyMd">{product.title}</Text>
        </InlineStack>
      ) : (
        subscription.productId
      ),
      subscription.variantId || "All variants",
      subscription.quantity || 1,
      subscription.notified ? (
        <Badge tone="success">Notified</Badge>
      ) : (
        <Badge tone="attention">Waiting</Badge>
      ),
      new Date(subscription.createdAt).toLocaleDateString(),
      subscription.notifiedAt ? new Date(subscription.notifiedAt).toLocaleDateString() : "-",
      <InlineStack gap="200">
        {!subscription.notified && (
          <Button
            size="micro"
            onClick={() => markAsNotified(subscription.id)}
            loading={isLoading}
          >
            Mark Notified
          </Button>
        )}
        <Button
          size="micro"
          tone="critical"
          onClick={() => handleDelete(subscription.id)}
          loading={isLoading}
        >
          Delete
        </Button>
      </InlineStack>,
    ];
  });

  return (
    <Page>
      <TitleBar title="Subscriptions" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  Back in Stock Subscriptions ({pagination.totalCount})
                </Text>
              </InlineStack>

              <InlineStack gap="400">
                <div style={{ width: "300px" }}>
                  <TextField
                    label=""
                    placeholder="Search by email or product ID"
                    value={filters.search}
                    onChange={handleSearch}
                    autoComplete="off"
                  />
                </div>
                <div style={{ width: "200px" }}>
                  <Select
                    label=""
                    options={[
                      { label: "All subscriptions", value: "all" },
                      { label: "Active only", value: "active" },
                      { label: "Notified only", value: "notified" },
                    ]}
                    value={filters.status}
                    onChange={handleStatusFilter}
                  />
                </div>
              </InlineStack>

              {subscriptions.length > 0 ? (
                <>
                  <DataTable
                    columnContentTypes={["text", "text", "text", "numeric", "text", "text", "text", "text"]}
                    headings={["Email", "Product", "Variant", "Qty", "Status", "Subscribed", "Notified", "Actions"]}
                    rows={rows}
                  />
                  
                  {pagination.totalPages > 1 && (
                    <InlineStack align="center">
                      <Pagination
                        hasPrevious={pagination.hasPrevious}
                        onPrevious={() => {
                          const params = new URLSearchParams(window.location.search);
                          params.set("page", (pagination.currentPage - 1).toString());
                          window.location.href = `?${params.toString()}`;
                        }}
                        hasNext={pagination.hasNext}
                        onNext={() => {
                          const params = new URLSearchParams(window.location.search);
                          params.set("page", (pagination.currentPage + 1).toString());
                          window.location.href = `?${params.toString()}`;
                        }}
                      />
                    </InlineStack>
                  )}
                </>
              ) : (
                <EmptyState
                  heading="No subscriptions found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {filters.search || filters.status !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "Customers will appear here when they subscribe for back-in-stock notifications."}
                  </p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Subscription"
        primaryAction={{
          content: "Delete",
          onAction: confirmDelete,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowDeleteModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>Are you sure you want to delete this subscription? This action cannot be undone.</p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}