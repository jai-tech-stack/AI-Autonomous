import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;

export function assertStripeConfigured(): void {
  if (!stripeSecret) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
}

export const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' })
  : (null as unknown as Stripe);

export async function createCheckoutSession(params: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}) {
  assertStripeConfigured();
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    metadata: params.metadata,
  });
}

export async function constructWebhookEvent(rawBody: Buffer, signature: string) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  assertStripeConfigured();
  return stripe.webhooks.constructEvent(rawBody, signature, whSecret);
}


