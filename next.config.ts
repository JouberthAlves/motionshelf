import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // "Pix Notification" virou "Payment Notification": os endereços antigos continuam funcionando.
  async redirects() {
    return [
      { source: "/:locale(en|pt)/components/pix-notification", destination: "/:locale/components/payment-notification", permanent: true },
      { source: "/r/pix-notification.json", destination: "/r/payment-notification.json", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
