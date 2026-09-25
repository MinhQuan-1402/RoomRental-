import { AuthGuard } from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layouts/AuthenticatedLayout";
import { AuthProvider } from "@/lib/auth-context";

export default function AuthenticatedGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </AuthGuard>
    </AuthProvider>
  );
}
