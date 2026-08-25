import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#0b0e11",
    description: "Find the right AI agent for the job on BNB Chain.",
    display: "standalone",
    icons: [
      {
        sizes: "512x512",
        src: "/icon",
        type: "image/png",
      },
      {
        sizes: "180x180",
        src: "/apple-icon",
        type: "image/png",
      },
    ],
    name: "Sift — AI Agent Discovery",
    short_name: "Sift",
    start_url: "/",
    theme_color: "#0b0e11",
  };
}
