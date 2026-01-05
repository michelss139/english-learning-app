import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";

export async function POST(req: Request) {
  try {
    // 👇 DIAGNOSTYKA KLUCZA STRIPE
    console.log(
      "CHECKOUT STRIPE_SECRET_KEY prefix:",
      process.env.STRIPE_SECRET_KEY?.slice(0, 12)
    );
    console.log(
      "CHECKOUT STRIPE_SECRET_KEY length:",
      process.env.STRIPE_SECRET_KEY?.length
    );

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app?canceled=1`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error("CHECKOUT ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Checkout error" },
      { status: 500 }
    );
  }
}
