type RazorpayApiError = {
  statusCode?: number;
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
};

export function parseRazorpayError(err: unknown): {
  message: string;
  description: string;
  statusCode: number;
  code?: string;
} {
  if (err && typeof err === "object") {
    const apiErr = err as RazorpayApiError;
    const description =
      apiErr.error?.description ??
      (err instanceof Error ? err.message : undefined) ??
      "Razorpay order creation failed.";
    const statusCode = apiErr.statusCode ?? 500;
    const code = apiErr.error?.code;
    return {
      message: description,
      description,
      statusCode,
      code,
    };
  }
  return {
    message: "Razorpay order creation failed.",
    description: "Unknown Razorpay error.",
    statusCode: 500,
  };
}

export function razorpayErrorResponse(err: unknown) {
  const parsed = parseRazorpayError(err);
  const isAuth = parsed.statusCode === 401 || parsed.code === "BAD_REQUEST_ERROR";
  const authHint =
    "Copy Key ID and Key Secret as a matching pair from Razorpay Dashboard → Account & Settings → API Keys. Ensure RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID are identical.";
  return {
    error: isAuth ? "Razorpay authentication failed" : "Razorpay order creation failed",
    details: isAuth ? `${parsed.description} ${authHint}` : parsed.description,
    code: isAuth ? "razorpay_auth_failed" : "razorpay_order_failed",
    status: isAuth ? 401 : parsed.statusCode >= 400 && parsed.statusCode < 600 ? parsed.statusCode : 500,
  };
}
