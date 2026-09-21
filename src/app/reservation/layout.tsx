import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "رزرو میز",
  description:
    "رزرو میز کافه رستوران با انتخاب تاریخ شمسی، تعداد مهمان و بازه زمانی.",
  alternates: { canonical: "/reservation" },
  openGraph: {
    title: "رزرو میز | کافه رستوران",
    description: "رزرو میز کافه رستوران با انتخاب تاریخ شمسی و بازه زمانی.",
    type: "website",
  },
};

export default function ReservationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
