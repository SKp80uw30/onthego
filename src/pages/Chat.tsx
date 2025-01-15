import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Chat = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Onboarding
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="text-lg">Chat functionality coming soon...</div>
        </div>
      </div>
    </div>
  );
};

export default Chat;