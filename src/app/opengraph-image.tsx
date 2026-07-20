import { ImageResponse } from "next/og";
export const alt = "Al Hinnawi Interiors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() { return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#f2f7fb", color: "#172431", fontFamily: "sans-serif" }}><div style={{ width: 110, height: 110, borderRadius: 24, background: "#1768aa", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 58 }}>H</div><div style={{ fontSize: 68, fontWeight: 800, marginTop: 30 }}>AL HINNAWI</div><div style={{ fontSize: 30, color: "#526b80", marginTop: 18 }}>Interiors and Wardrobes, designed with care.</div></div>); }
