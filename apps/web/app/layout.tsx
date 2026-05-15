import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ejam — College Predictor",
  description: "Predict your college admissions for JEE Advanced and JEE Main.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
