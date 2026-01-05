import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();

  const h = await headers();
  const sig = h.get("stripe-signature");
  if (!sig) return new NextResponse("Missing stripe-signature header", { status: 400 });

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    // email bywa w różnych polach zależnie od konfiguracji checkout
    const email =
      session?.customer_details?.email ||
      session?.customer_email ||
      session?.customer?.email;

    if (email) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ subscription_status: "active" })
        .eq("email", email);

      if (error) {
        console.error("Supabase update error:", error);
        return new NextResponse("Failed to update subscription status", { status: 500 });
      }
    } else {
      console.error("No email on checkout session:", session?.id);
      return new NextResponse("No email on checkout session", { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}
