import Navigation from "@/components/Navigation";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Main content area */}
      <main className="md:ml-56 pt-14 pb-16 md:pt-0 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
