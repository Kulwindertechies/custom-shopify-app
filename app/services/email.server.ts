// Email service for sending back-in-stock notifications
// In a production app, you would integrate with services like:
// - SendGrid
// - Mailgun
// - Amazon SES
// - Postmark

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ProductData {
  id: string;
  title: string;
  handle: string;
  imageUrl?: string;
}

interface ShopData {
  name: string;
  domain: string;
}

export class EmailService {
  static async sendBackInStockNotification(
    email: string,
    product: ProductData,
    shop: ShopData,
    template: {
      subject: string;
      body: string;
    },
  ): Promise<boolean> {
    try {
      // Replace template variables
      const productUrl = `https://${shop.domain}/products/${product.handle}`;

      const subject = template.subject
        .replace(/\{\{product_title\}\}/g, product.title)
        .replace(/\{\{shop_name\}\}/g, shop.name);

      const body = template.body
        .replace(/\{\{product_title\}\}/g, product.title)
        .replace(/\{\{product_url\}\}/g, productUrl)
        .replace(/\{\{shop_name\}\}/g, shop.name)
        .replace(/\{\{customer_email\}\}/g, email);

      // Convert plain text to HTML
      const html = body.replace(/\n/g, "<br>");

      const emailData: EmailData = {
        to: email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Good news from ${shop.name}!</h2>
            ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.title}" style="max-width: 200px; height: auto; margin: 20px 0;">` : ""}
            <div style="line-height: 1.6; color: #555;">
              ${html}
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px;">
              <p>You received this email because you subscribed to back-in-stock notifications for ${product.title}.</p>
            </div>
          </div>
        `,
        text: body,
      };

      // In a real implementation, you would send the email here
      // For now, we'll just log it and return true
      console.log("📧 Back-in-stock email would be sent:", {
        to: emailData.to,
        subject: emailData.subject,
        product: product.title,
        shop: shop.name,
      });

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      console.error("Failed to send back-in-stock email:", error);
      return false;
    }
  }

  // Example integration with SendGrid
  static async sendWithSendGrid(emailData: EmailData): Promise<boolean> {
    // Uncomment and configure when you have SendGrid API key
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    try {
      await sgMail.send({
        to: emailData.to,
        from: process.env.FROM_EMAIL,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
      return true;
    } catch (error) {
      console.error('SendGrid error:', error);
      return false;
    }
    */
    return false;
  }

  // Example integration with Mailgun
  static async sendWithMailgun(emailData: EmailData): Promise<boolean> {
    // Uncomment and configure when you have Mailgun credentials
    /*
    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
    });
    
    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: process.env.FROM_EMAIL,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
      return true;
    } catch (error) {
      console.error('Mailgun error:', error);
      return false;
    }
    */
    return false;
  }
}
