import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="max-w-md mx-auto">
        <div className="text-6xl font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};