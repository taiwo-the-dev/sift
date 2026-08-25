import { ImageResponse } from "next/og";

export const size = {
  height: 180,
  width: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f0b90b",
          borderRadius: 36,
          color: "#0b0e11",
          display: "flex",
          fontSize: 108,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.08em",
          paddingRight: 10,
          width: "100%",
        }}
      >
        S
      </div>
    ),
    size,
  );
}
