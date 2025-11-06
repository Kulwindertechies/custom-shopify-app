import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Shop parameter required" }, { status: 400 });
  }

  try {
    // Get settings for the shop
    const settings = await db.backInStockSettings.findUnique({
      where: { shop },
      select: {
        enabled: true,
        buttonText: true,
        successMessage: true,
      },
    });

    if (!settings) {
      return json({ 
        enabled: false,
        buttonText: "Notify Me When Available",
        successMessage: "Thanks! We'll notify you when this product is back in stock."
      });
    }

    return json(settings, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });

  } catch (error) {
    console.error("Error fetching settings:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};