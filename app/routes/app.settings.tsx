import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  TextField,
  FormLayout,
  Banner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  // Get or create settings
  let settings = await db.backInStockSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    settings = await db.backInStockSettings.create({
      data: { shop },
    });
  }

  return { settings };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  
  const formData = await request.formData();
  const emailSubject = formData.get("emailSubject") as string;
  const emailTemplate = formData.get("emailTemplate") as string;
  const buttonText = formData.get("buttonText") as string;
  const successMessage = formData.get("successMessage") as string;

  try {
    await db.backInStockSettings.update({
      where: { shop },
      data: {
        emailSubject,
        emailTemplate,
        buttonText,
        successMessage,
      },
    });

    return { success: true, message: "Settings updated successfully!" };
  } catch (error) {
    return { success: false, message: "Failed to update settings" };
  }
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const shopify = useAppBridge();
  const isLoading = nav.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show(actionData.message);
    }
  }, [actionData, shopify]);

  return (
    <Page>
      <TitleBar title="Back in Stock Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Email Template Settings
              </Text>
              
              {actionData && !actionData.success && (
                <Banner tone="critical">
                  <p>{actionData.message}</p>
                </Banner>
              )}

              <Form method="post">
                <FormLayout>
                  <TextField
                    label="Email Subject"
                    name="emailSubject"
                    value={settings.emailSubject}
                    helpText="Available variables: {{product_title}}, {{shop_name}}"
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="Email Template"
                    name="emailTemplate"
                    value={settings.emailTemplate}
                    multiline={6}
                    helpText="Available variables: {{product_title}}, {{product_url}}, {{shop_name}}, {{customer_email}}"
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="Button Text"
                    name="buttonText"
                    value={settings.buttonText}
                    helpText="Text displayed on the 'Notify Me' button"
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="Success Message"
                    name="successMessage"
                    value={settings.successMessage}
                    helpText="Message shown after successful subscription"
                    autoComplete="off"
                  />
                  
                  <Button submit loading={isLoading} variant="primary">
                    Save Settings
                  </Button>
                </FormLayout>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Available Variables
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>{"{{product_title}}"}</strong> - Product name
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>{"{{product_url}}"}</strong> - Link to product page
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>{"{{shop_name}}"}</strong> - Your store name
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>{"{{customer_email}}"}</strong> - Customer's email
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Preview
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>Subject:</strong> {settings.emailSubject.replace('{{product_title}}', 'Sample Product').replace('{{shop_name}}', 'Your Store')}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Message:</strong>
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {settings.emailTemplate
                    .replace('{{product_title}}', 'Sample Product')
                    .replace('{{product_url}}', 'https://yourstore.com/products/sample')
                    .replace('{{shop_name}}', 'Your Store')
                    .replace('{{customer_email}}', 'customer@example.com')
                  }
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}