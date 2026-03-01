import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>shadcn is working</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </CardContent>
      </Card>
    </main>
  );
}