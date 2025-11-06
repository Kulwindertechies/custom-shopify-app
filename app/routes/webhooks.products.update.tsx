import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    throw new Response();
  }

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const product = payload as {
      id: string;
      title: string;
      handle: string;
      variants: Array<{
        id: string;
        inventory_quantity: number;
      }>;
    };

    // This webhook can be used to sync product data for better email content
    // For now, we'll just log it
    console.log(`Product updated: ${product.title} (${product.id})`);
    
    // You could update cached product data here if needed
    // or trigger notifications if variants became available
    
  } catch (error) {
    console.error("Error processing product update webhook:", error);
  }

  return new Response();
};