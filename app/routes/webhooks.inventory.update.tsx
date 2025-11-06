import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    throw new Response();
  }

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const inventoryLevel = payload as {
      inventory_item_id: string;
      location_id: string;
      available: number;
    };

    // Only process if inventory is now available
    if (inventoryLevel.available > 0) {
      // Get the variant associated with this inventory item
      const variantResponse = await admin.graphql(`
        query getVariantByInventoryItem($inventoryItemId: ID!) {
          productVariant(id: "gid://shopify/InventoryItem/${inventoryItemId}") {
            id
            product {
              id
              title
              handle
              featuredImage {
                url
              }
            }
          }
        }
      `, {
        variables: {
          inventoryItemId: inventoryLevel.inventory_item_id,
        },
      });

      const variantData = await variantResponse.json();
      const variant = variantData.data?.productVariant;

      if (variant) {
        const productId = variant.product.id.replace('gid://shopify/Product/', '');
        const variantId = variant.id.replace('gid://shopify/ProductVariant/', '');

        // Find all subscriptions for this product/variant
        const subscriptions = await db.backInStockSubscription.findMany({
          where: {
            shop,
            productId,
            variantId: variantId,
            notified: false,
          },
        });

        console.log(`Found ${subscriptions.length} subscriptions for product ${productId}, variant ${variantId}`);

        // Get shop settings for email template
        const settings = await db.backInStockSettings.findUnique({
          where: { shop },
        });

        if (subscriptions.length > 0 && settings?.enabled) {
          // Get shop info for email
          const shopResponse = await admin.graphql(`
            query getShop {
              shop {
                name
                primaryDomain {
                  host
                }
              }
            }
          `);
          
          const shopData = await shopResponse.json();
          const shopInfo = shopData.data?.shop;
          
          // Process notifications (in a real app, you'd use a queue)
          for (const subscription of subscriptions) {
            try {
              // Import email service
              const { EmailService } = await import("../services/email.server");
              
              // Send email notification
              const emailSent = await EmailService.sendBackInStockNotification(
                subscription.email,
                {
                  id: productId,
                  title: variant.product.title,
                  handle: variant.product.handle,
                  imageUrl: variant.product.featuredImage?.url,
                },
                {
                  name: shopInfo?.name || shop,
                  domain: shopInfo?.primaryDomain?.host || shop,
                },
                {
                  subject: settings.emailSubject,
                  body: settings.emailTemplate,
                }
              );
              
              await db.backInStockNotification.create({
                data: {
                  subscriptionId: subscription.id,
                  email: subscription.email,
                  productId: subscription.productId,
                  variantId: subscription.variantId,
                  shop: subscription.shop,
                  status: emailSent ? 'sent' : 'failed',
                },
              });

              await db.backInStockSubscription.update({
                where: { id: subscription.id },
                data: {
                  notified: true,
                  notifiedAt: new Date(),
                },
              });

              console.log(`Notification ${emailSent ? 'sent' : 'failed'} to ${subscription.email} for product ${productId}`);
            } catch (error) {
              console.error(`Failed to send notification to ${subscription.email}:`, error);
              
              await db.backInStockNotification.create({
                data: {
                  subscriptionId: subscription.id,
                  email: subscription.email,
                  productId: subscription.productId,
                  variantId: subscription.variantId,
                  shop: subscription.shop,
                  status: 'failed',
                },
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing inventory update webhook:", error);
  }

  return new Response();
};