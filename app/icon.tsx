import { ImageResponse } from "next/og";

export const size = {
  height: 512,
  width: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f0b90b",
          color: "#0b0e11",
          display: "flex",
          fontSize: 300,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.08em",
          paddingRight: 28,
          width: "100%",
        }}
      >
        S
      </div>
    ),
    size,
  );
}
