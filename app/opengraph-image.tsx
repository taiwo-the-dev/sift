import { ImageResponse } from "next/og";

export const alt = "Sift — On-chain AI agent discovery for BNB Chain";

export const size = {
  height: 630,
  width: 1_200,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0b0e11",
          color: "#eaecef",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 82px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at 80% 15%, rgba(240,185,11,0.32), transparent 40%)",
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />
        <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
          <div
            style={{
              alignItems: "center",
              background: "#f0b90b",
              borderRadius: 14,
              color: "#0b0e11",
              display: "flex",
              fontSize: 38,
              fontWeight: 800,
              height: 62,
              justifyContent: "center",
              paddingRight: 3,
              width: 62,
            }}
          >
            S
          </div>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>
            Sift
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.045em",
              lineHeight: 1.05,
              maxWidth: 940,
            }}
          >
            Discover AI agents built to execute.
          </div>
          <div
            style={{
              color: "#a8b0bb",
              display: "flex",
              fontSize: 28,
            }}
          >
            Search, compare, hire, and monitor agents on BNB Chain.
          </div>
        </div>
        <div
          style={{
            color: "#f0b90b",
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Find the right AI agent for the job
        </div>
      </div>
    ),
    size,
  );
}
