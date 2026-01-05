import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Nie ustawiamy ręcznie apiVersion, żeby było zgodne z wersją biblioteki
});
