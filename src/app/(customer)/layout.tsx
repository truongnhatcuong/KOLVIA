import type { ReactNode } from "react";
import { Header, Footer } from "@/components/customer/header";
import { CustomerFrame } from "@/components/customer/frame";
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <CustomerFrame header={<Header />} footer={<Footer />}>
      {children}
    </CustomerFrame>
  );
}
