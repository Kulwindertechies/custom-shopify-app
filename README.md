# Back in Stock Notification App

A Shopify app that allows customers to subscribe for email notifications when out-of-stock products become available again.

## Features

### Merchant Dashboard
- **Dashboard Overview**: View subscription statistics and recent activity
- **Subscription Management**: View, filter, and manage customer subscriptions
- **Email Template Customization**: Customize email subject, content, and button text
- **Enable/Disable Feature**: Toggle the back-in-stock functionality on/off

### Customer Experience
- **Smart Detection**: Automatically shows "Notify Me" button when products are out of stock
- **Easy Subscription**: Simple email form for customers to subscribe
- **Automatic Notifications**: Customers receive emails when products are back in stock
- **Theme Integration**: Seamlessly integrates with any Shopify theme via Theme App Extension

## Tech Stack

- **Framework**: Remix
- **Database**: Prisma + SQLite (development) / PostgreSQL (production)
- **UI**: Shopify Polaris
- **Authentication**: Shopify OAuth
- **Webhooks**: Inventory updates, Product updates
- **Theme Extension**: Liquid templates

## Installation

### Prerequisites
- Node.js 18.20+ or 20.10+
- Shopify CLI
- Shopify Partner Account
- Development Store

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kulwinderkumar/shopify-app.git
   cd shopify-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Start development server**
   ```bash
   shopify app dev
   ```

## Configuration

### Required Scopes
- `read_customers`
- `read_inventory` 
- `write_customers`
- `write_products`

### Webhooks
- `inventory_levels/update` - Triggers notifications when inventory changes
- `products/update` - Syncs product data for better email content

### App Proxy
- URL: `/apps/stockpilot`
- Subpath: `api`
- Prefix: `apps`

## Usage

### For Merchants

1. **Install the App**: Install from development or deploy to production
2. **Configure Settings**: Go to Settings page to customize email templates
3. **Add to Theme**: Use Theme Editor to add "Back in Stock Form" block to product pages
4. **Monitor Subscriptions**: Use Dashboard and Subscriptions pages to track activity

### For Customers

1. **Visit Product Page**: When a product is out of stock, "Notify Me" button appears
2. **Subscribe**: Click button and enter email address
3. **Get Notified**: Receive email when product is back in stock

## API Endpoints

### Admin Routes (Authenticated)
- `GET /app` - Dashboard with statistics
- `GET /app/subscriptions` - Manage subscriptions
- `GET /app/settings` - Configure email templates

### Public API (App Proxy)
- `POST /app/proxy/api/subscribe` - Create subscription
- `GET /app/proxy/api/settings` - Get app settings

### Webhooks
- `POST /webhooks/inventory/update` - Handle inventory changes
- `POST /webhooks/products/update` - Handle product updates

## Database Schema

### BackInStockSubscription
- Customer email subscriptions with product/variant tracking
- Notification status and timestamps

### BackInStockSettings  
- Per-shop configuration for email templates and app settings

### BackInStockNotification
- Email delivery tracking and status

## Development

### Database Migrations
```bash
npx prisma migrate dev --name migration_name
npx prisma generate
```

### Testing Webhooks
```bash
shopify app webhook trigger --topic=inventory_levels/update
```

### Theme Extension Development
The theme extension is located in `extensions/back-in-stock/blocks/`

## Deployment

1. **Update Database**: Switch to PostgreSQL for production
2. **Configure Email Service**: Set up SendGrid, Mailgun, or similar
3. **Deploy**: Use `shopify app deploy` or deploy to hosting platform

## Environment Variables

```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_customers,read_inventory,write_customers,write_products
DATABASE_URL=your_database_url
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions:
- Check the Shopify App documentation
- Review webhook logs in admin dashboard
- Test Theme App Extension in theme editor
- Verify email service configuration