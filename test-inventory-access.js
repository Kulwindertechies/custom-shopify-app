/**
 * Test script to verify Shopify API access token and inventory item access
 * 
 * Usage: node test-inventory-access.js
 */

const ACCESS_TOKEN = "shpua_01a87a52efff5bf6b1f48f36c7ab86ae";
const SHOP_DOMAIN = "stockpilot-v2.myshopify.com";
const VARIANT_ID = "46861761511677";
const API_VERSION = "2024-10";

async function testShopifyAccess() {
  console.log("🔍 Testing Shopify API Access...\n");
  console.log(`Shop: ${SHOP_DOMAIN}`);
  console.log(`Variant ID: ${VARIANT_ID}`);
  console.log(`Token: ${ACCESS_TOKEN.substring(0, 15)}...\n`);

  // Test 1: Check token validity and scopes
  console.log("📋 Test 1: Checking token scopes...");
  try {
    const scopeResponse = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: `
            query {
              shop {
                name
                myshopifyDomain
              }
            }
          `,
        }),
      }
    );

    const scopeData = await scopeResponse.json();
    
    if (scopeResponse.status === 401) {
      console.log("❌ Token is invalid or expired (401 Unauthorized)");
      console.log("Response:", JSON.stringify(scopeData, null, 2));
      return;
    }

    if (scopeData.errors) {
      console.log("❌ GraphQL Errors:");
      console.log(JSON.stringify(scopeData.errors, null, 2));
      return;
    }

    console.log("✅ Token is valid!");
    console.log(`   Shop Name: ${scopeData.data?.shop?.name}`);
    console.log(`   Domain: ${scopeData.data?.shop?.myshopifyDomain}\n`);

    // Check response headers for scopes
    const scopesHeader = scopeResponse.headers.get("X-Shopify-API-Grant-Scopes");
    if (scopesHeader) {
      console.log("📜 Granted Scopes:");
      scopesHeader.split(",").forEach((scope) => {
        console.log(`   - ${scope.trim()}`);
      });
      console.log();
    }
  } catch (error) {
    console.log("❌ Error checking token:", error.message);
    return;
  }

  // Test 2: Get inventory item ID from variant ID
  console.log("📦 Test 2: Getting inventory item ID from variant...");
  try {
    const variantGid = `gid://shopify/ProductVariant/${VARIANT_ID}`;
    
    const inventoryResponse = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: `
            query getInventoryItem($variantId: ID!) {
              productVariant(id: $variantId) {
                id
                title
                sku
                inventoryItem {
                  id
                  tracked
                }
              }
            }
          `,
          variables: {
            variantId: variantGid,
          },
        }),
      }
    );

    const inventoryData = await inventoryResponse.json();

    if (inventoryResponse.status === 401) {
      console.log("❌ 401 Unauthorized - Token doesn't have required permissions");
      console.log("Response:", JSON.stringify(inventoryData, null, 2));
      return;
    }

    if (inventoryData.errors) {
      console.log("❌ GraphQL Errors:");
      console.log(JSON.stringify(inventoryData.errors, null, 2));
      
      // Check if it's a permission error
      const permissionError = inventoryData.errors.find(
        (e) => e.message?.includes("access") || e.message?.includes("permission")
      );
      if (permissionError) {
        console.log("\n⚠️  This looks like a permission issue.");
        console.log("   Required scopes: read_products, read_inventory");
      }
      return;
    }

    const variant = inventoryData.data?.productVariant;
    if (!variant) {
      console.log("❌ Variant not found");
      return;
    }

    console.log("✅ Successfully retrieved inventory item!");
    console.log(`   Variant ID: ${variant.id}`);
    console.log(`   Variant Title: ${variant.title}`);
    console.log(`   SKU: ${variant.sku || "N/A"}`);
    console.log(`   Inventory Item ID: ${variant.inventoryItem?.id}`);
    console.log(`   Tracked: ${variant.inventoryItem?.tracked}\n`);
  } catch (error) {
    console.log("❌ Error getting inventory item:", error.message);
    return;
  }

  // Test 3: Get inventory levels
  console.log("📊 Test 3: Getting inventory levels...");
  try {
    const variantGid = `gid://shopify/ProductVariant/${VARIANT_ID}`;
    
    const levelsResponse = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: `
            query getInventoryLevels($variantId: ID!) {
              productVariant(id: $variantId) {
                id
                inventoryItem {
                  id
                  inventoryLevels(first: 5) {
                    edges {
                      node {
                        id
                        available
                        location {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: {
            variantId: variantGid,
          },
        }),
      }
    );

    const levelsData = await levelsResponse.json();

    if (levelsData.errors) {
      console.log("❌ GraphQL Errors:");
      console.log(JSON.stringify(levelsData.errors, null, 2));
      return;
    }

    const inventoryLevels =
      levelsData.data?.productVariant?.inventoryItem?.inventoryLevels?.edges || [];

    if (inventoryLevels.length === 0) {
      console.log("⚠️  No inventory levels found");
      return;
    }

    console.log("✅ Inventory Levels:");
    inventoryLevels.forEach(({ node }) => {
      console.log(`   Location: ${node.location.name}`);
      console.log(`   Available: ${node.available}`);
      console.log(`   Level ID: ${node.id}\n`);
    });
  } catch (error) {
    console.log("❌ Error getting inventory levels:", error.message);
  }

  console.log("✅ All tests completed!");
}

// Run the tests
testShopifyAccess().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
