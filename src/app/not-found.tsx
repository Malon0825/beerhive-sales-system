import Link from 'next/link';
import { Button } from '@/views/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-6xl font-bold">404</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-xl mb-4">Page Not Found</p>
          <p className="text-muted-foreground mb-6">
            The page you are looking for does not exist.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
