"use client";

import { Clock, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Plus size={20} className="text-primary" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="outline"
          className="justify-start gap-3 h-12 rounded-xl"
          onClick={() => router.push("/backlog?createTask=true")}
        >
          <Plus size={18} />
          New Task
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-3 h-12 rounded-xl"
          onClick={() => router.push("/backlog?createSprint=true")}
        >
          <Clock size={18} />
          Start Sprint
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-3 h-12 rounded-xl"
          onClick={() => router.push("/settings/team")}
        >
          <Users size={18} />
          Invite Team
        </Button>
      </div>
    </div>
  );
}
