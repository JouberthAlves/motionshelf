import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tudo menos API, arquivos internos do Next, o registry e arquivos com extensão.
  matcher: "/((?!api|_next|_vercel|r/|.*\\..*).*)",
};
