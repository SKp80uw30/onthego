import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectedWorkspaceProps {
  workspaceName: string;
  className?: string;
}

export const ConnectedWorkspace = ({ workspaceName, className }: ConnectedWorkspaceProps) => {
  return (
    <div className={cn(
      'glass-morphism rounded-xl p-3 border border-white/20',
      'flex items-center space-x-2',
      className
    )}>
      <CheckCircle2 className="h-5 w-5 text-green-500" />
      <span className="text-sm text-muted-foreground">
        Connected to {workspaceName} workspace
      </span>
    </div>
  );
};