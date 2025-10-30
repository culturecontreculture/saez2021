"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/format-login");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300"></div>
    </div>
  );
}
