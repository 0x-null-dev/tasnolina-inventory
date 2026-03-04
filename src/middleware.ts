import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/prijava",
  },
});

export const config = {
  matcher: [
    "/magacin/:path*",
    "/istorija/:path*",
    "/otpremnice/:path*",
    "/kalkulacije/:path*",
  ],
};
