import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // O site era em /en e /pt; ficou só em inglês, sem prefixo. Links antigos levam à mesma página.
      { source: "/:locale(en|pt)", destination: "/", permanent: true },
      { source: "/:locale(en|pt)/:path*", destination: "/:path*", permanent: true },
      // "Pix Notification" virou "Payment Notification": os endereços antigos continuam funcionando.
      { source: "/components/pix-notification", destination: "/components/payment-notification", permanent: true },
      { source: "/r/pix-notification.json", destination: "/r/payment-notification.json", permanent: true },
      // Langendorff Heart saiu do catálogo (travava o site em GPU fraca): o endereço antigo vai pra galeria.
      { source: "/components/langendorff-heart", destination: "/components", permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
