import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * API endpoint to get inventory item ID from variant ID
 * This can be called from your backend with proper authentication
 * 
 * Usage: GET /api/inventory-item?variantId=gid://shopify/ProductVariant/123456
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    const url = new URL(request.url);
    const variantId = url.searchParams.get("variantId");

    if (!variantId) {
      return new Response(
        JSON.stringify({ error: "variantId parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Query to get inventory item ID from variant ID
    const response = await admin.graphql(
      `
      query getInventoryItem($variantId: ID!) {
        productVariant(id: $variantId) {
          id
          inventoryItem {
            id
          }
        }
      }
    `,
      {
        variables: {
          variantId: variantId,
        },
      }
    );

    const data: any = await response.json();

    if (data.errors) {
      return new Response(
        JSON.stringify({
          error: "GraphQL errors",
          details: data.errors,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const inventoryItemId = data.data?.productVariant?.inventoryItem?.id;

    if (!inventoryItemId) {
      return new Response(
        JSON.stringify({
          error: "Inventory item not found for this variant",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        variantId: variantId,
        inventoryItemId: inventoryItemId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching inventory item:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
