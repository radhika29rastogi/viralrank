export {};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayCheckoutInstance = {
  open: () => void;
  close: () => void;
};
