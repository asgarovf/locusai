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
          className="justify-start gap-3 h-12 rounded-xl group"
          onClick={() => router.push("/backlog?createTask=true")}
        >
          <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Plus size={16} />
          </div>
          New Task
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-3 h-12 rounded-xl group"
          onClick={() => router.push("/backlog?createSprint=true")}
        >
          <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Clock size={16} />
          </div>
          Start Sprint
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-3 h-12 rounded-xl group"
          onClick={() => router.push("/settings/team")}
        >
          <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <Users size={16} />
          </div>
          Invite Team
        </Button>
      </div>
    </div>
  );
}
