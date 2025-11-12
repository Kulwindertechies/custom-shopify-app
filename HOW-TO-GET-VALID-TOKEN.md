# How to Get a Valid Access Token for Backend API Calls

## ❌ Current Issue
The token `shpua_01a87a52efff5bf6b1f48f36c7ab86ae` is **invalid or expired**.

Error: `[API] Invalid API key or access token (unrecognized login or wrong password)`

---

## ✅ Solution: Create a Custom App

Follow these steps to get a valid access token:

### Step 1: Go to Your Shopify Admin
Navigate to: https://stockpilot-v2.myshopify.com/admin

### Step 2: Access App Development
1. Click **Settings** (bottom left)
2. Click **Apps and sales channels**
3. Click **Develop apps** (top right)
4. Click **Create an app**

### Step 3: Create the App
1. **App name**: `Stockpilot Backend API`
2. Click **Create app**

### Step 4: Configure API Scopes
1. Click **Configure Admin API scopes**
2. Scroll down and select these scopes:
   - ✅ `read_products` - Read products, variants, and collections
   - ✅ `write_products` - Modify products, variants, and collections
   - ✅ `read_inventory` - Read inventory
   - ✅ `write_inventory` - Adjust inventory levels
3. Click **Save**

### Step 5: Install the App
1. Click **Install app** (top right)
2. Click **Install** in the confirmation dialog
3. **IMPORTANT**: Copy the **Admin API access token** that appears
   - This is shown only once!
   - It will look like: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Save it securely

### Step 6: Test the New Token
1. Open `test-inventory-access.js`
2. Replace the `ACCESS_TOKEN` value with your new token
3. Run: `node test-inventory-access.js`
4. You should see ✅ success messages

---

## 🔐 Token Types Explained

### Custom App Token (What You Need)
- Format: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Can be used from**: Any server (backend, cron jobs, etc.)
- **Expires**: Never (unless you revoke it)
- **Use for**: Backend API calls

### Embedded App Token (What You Have)
- Format: `shpua_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Can be used from**: Only within the Shopify embedded app
- **Expires**: After a short time (session-based)
- **Use for**: Shopify app UI interactions

---

## 📝 Using the Token in Your Backend

Once you have the custom app token, use it like this:

### GraphQL Example (Get Inventory Item ID)
\`\`\`javascript
const response = await fetch(
  'https://stockpilot-v2.myshopify.com/admin/api/2024-10/graphql.json',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': 'YOUR_CUSTOM_APP_TOKEN_HERE'
    },
    body: JSON.stringify({
      query: \`
        query getInventoryItem($variantId: ID!) {
          productVariant(id: $variantId) {
            id
            inventoryItem {
              id
            }
          }
        }
      \`,
      variables: {
        variantId: 'gid://shopify/ProductVariant/46861761511677'
      }
    })
  }
);

const data = await response.json();
console.log(data.data.productVariant.inventoryItem.id);
// Output: gid://shopify/InventoryItem/48863063646461
\`\`\`

### REST API Example (Alternative)
\`\`\`javascript
const response = await fetch(
  'https://stockpilot-v2.myshopify.com/admin/api/2024-10/variants/46861761511677.json',
  {
    headers: {
      'X-Shopify-Access-Token': 'YOUR_CUSTOM_APP_TOKEN_HERE'
    }
  }
);

const data = await response.json();
console.log(data.variant.inventory_item_id);
\`\`\`

---

## 🔒 Security Best Practices

1. **Never commit tokens to Git**
   - Add to `.env` file
   - Add `.env` to `.gitignore`

2. **Store securely**
   - Use environment variables
   - Use secret management services (AWS Secrets Manager, etc.)

3. **Rotate regularly**
   - Create new tokens periodically
   - Revoke old tokens

4. **Limit scope**
   - Only grant necessary permissions
   - Use separate tokens for different purposes

---

## 🧪 Testing Checklist

After getting your new token, verify:

- [ ] Token starts with `shpat_` (not `shpua_`)
- [ ] Test script shows ✅ for all tests
- [ ] Can retrieve shop information
- [ ] Can get inventory item ID from variant ID
- [ ] Can read inventory levels
- [ ] Backend can make API calls successfully

---

## 📞 Need Help?

If you're still getting 401 errors after following these steps:

1. Double-check the token is copied correctly (no extra spaces)
2. Verify the custom app is installed in your store
3. Confirm the required scopes are granted
4. Check the API version matches (2024-10 or later)
5. Ensure the shop domain is correct: `stockpilot-v2.myshopify.com`
