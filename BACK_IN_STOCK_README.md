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

## Installation & Setup

### 1. Database Setup
The app uses Prisma with SQLite (development) or PostgreSQL (production). The database schema includes:
- `BackInStockSubscription`: Customer email subscriptions
- `BackInStockSettings`: App configuration per shop
- `BackInStockNotification`: Email delivery tracking

### 2. Shopify Configuration
Required scopes in `shopify.app.toml`:
```toml
scopes = "write_products,read_inventory,read_customers,write_customers"
```

Required webhooks:
- `inventory_levels/update`: Triggers notifications when inventory changes
- `products/update`: Syncs product data for better email content

### 3. Theme App Extension
The app includes a Theme App Extension that merchants can add to their product pages:
- Location: `extensions/back-in-stock/blocks/back-in-stock-form.liquid`
- Automatically detects out-of-stock products
- Customizable styling and text
- Responsive design

## Usage

### For Merchants

1. **Install the App**: Install from the Shopify App Store or via CLI
2. **Configure Settings**: Go to Settings page to customize email templates
3. **Add to Theme**: Use the Theme Editor to add the "Back in Stock Form" block to product pages
4. **Monitor Subscriptions**: Use the Dashboard and Subscriptions pages to track activity

### For Customers

1. **Visit Product Page**: When a product is out of stock, the "Notify Me" button appears
2. **Subscribe**: Click the button and enter email address
3. **Get Notified**: Receive email when product is back in stock
4. **Shop**: Click the link in the email to purchase the product

## API Endpoints

### Public API (for storefront)
- `POST /api/subscribe`: Create new subscription
- `GET /api/settings`: Get app settings for shop

### Admin API (authenticated)
- Dashboard data loading
- Subscription management
- Settings updates

## Email Service Integration

The app includes a flexible email service that can be integrated with:
- SendGrid
- Mailgun
- Amazon SES
- Postmark
- Custom SMTP

To configure email sending, update `app/services/email.server.ts` with your preferred service.

## Customization

### Email Templates
Merchants can customize:
- Email subject line
- Email body content
- Button text
- Success messages

Available template variables:
- `{{product_title}}`: Product name
- `{{product_url}}`: Link to product page
- `{{shop_name}}`: Store name
- `{{customer_email}}`: Customer's email

### Theme Integration
The Theme App Extension can be customized:
- Button colors and styling
- Form layout and positioning
- Text and messaging
- Show for all variants or specific variants

## Development

### Local Development
```bash
cd back-in-stock
npm install
shopify app dev
```

### Database Migrations
```bash
npx prisma migrate dev
npx prisma generate
```

### Testing Webhooks
```bash
shopify app webhook trigger --topic=inventory_levels/update
```

## Production Deployment

1. **Database**: Switch from SQLite to PostgreSQL in `prisma/schema.prisma`
2. **Email Service**: Configure production email service in `app/services/email.server.ts`
3. **Environment Variables**: Set up production environment variables
4. **Deploy**: Use `shopify app deploy` or deploy to your preferred hosting platform

## Security Considerations

- All webhook requests are verified with HMAC
- Email addresses are validated before storage
- Rate limiting prevents spam subscriptions
- Customer data is handled according to GDPR requirements

## Performance Optimization

- Database indexes on frequently queried fields
- Efficient GraphQL queries for product data
- Asynchronous email sending (recommended: use job queue in production)
- Pagination for large subscription lists

## Support

For issues or questions:
1. Check the Shopify App documentation
2. Review the webhook logs in the admin dashboard
3. Test the Theme App Extension in the theme editor
4. Verify email service configuration

## License

This app is built using the Shopify App Template and follows Shopify's development guidelines.