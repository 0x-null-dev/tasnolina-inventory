import { NextPage } from "next";

const ErrorPage: NextPage<{ statusCode?: number }> = ({ statusCode }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "48px", color: "#dc2626" }}>
          {statusCode || "Greska"}
        </h1>
        <p style={{ color: "#6b7280", marginTop: "8px" }}>
          Doslo je do greske
        </p>
        <a
          href="/magacin"
          style={{
            display: "inline-block",
            marginTop: "16px",
            padding: "8px 16px",
            backgroundColor: "#dc2626",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          Nazad na magacin
        </a>
      </div>
    </div>
  );
};

ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
