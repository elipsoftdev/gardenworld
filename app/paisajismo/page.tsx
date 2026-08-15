import type { Metadata } from "next";
import MvpRedirect from "../components/MvpRedirect";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LandscapePage() {
  return <MvpRedirect />;
}
