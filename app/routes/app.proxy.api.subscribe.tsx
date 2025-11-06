import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // This endpoint will be called from the storefront via app proxy
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { email, productId, variantId, shop } = body;

    // Basic validation
    if (!email || !productId || !shop) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check if settings allow subscriptions
    const settings = await db.backInStockSettings.findUnique({
      where: { shop },
    });

    if (!settings?.enabled) {
      return json({ error: "Back in stock notifications are disabled" }, { status: 403 });
    }

    // Check if subscription already exists
    const existingSubscription = await db.backInStockSubscription.findUnique({
      where: {
        email_productId_variantId_shop: {
          email,
          productId,
          variantId: variantId || "",
          shop,
        },
      },
    });

    if (existingSubscription) {
      if (existingSubscription.notified) {
        // Reset the subscription if it was already notified
        await db.backInStockSubscription.update({
          where: { id: existingSubscription.id },
          data: {
            notified: false,
            notifiedAt: null,
            createdAt: new Date(),
          },
        });
      }
      return json({ 
        success: true, 
        message: settings.successMessage,
        alreadySubscribed: true 
      });
    }

    // Create new subscription
    await db.backInStockSubscription.create({
      data: {
        email,
        productId,
        variantId: variantId || null,
        shop,
      },
    });

    return json({ 
      success: true, 
      message: settings.successMessage 
    });

  } catch (error) {
    console.error("Error creating subscription:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};

// Handle CORS and OPTIONS requests
export const loader = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};