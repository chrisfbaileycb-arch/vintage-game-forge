import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="paper-texture flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="stamp mb-4 inline-block text-[10px]">MISPRINT</p>
        <h1 className="engraved text-5xl font-semibold">404</h1>
        <p className="mt-3 text-muted-foreground">
          This page never left the press. Check the catalogue number and try
          again.
        </p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Back to the Foundry
        </Button>
      </div>
    </div>
  );
}
