import React, { useEffect, useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { contextAPI } from '../../services/api';
import { cn } from '../../lib/utils';

interface SuggestionsProps {
  projectId: string | null;
  onSuggestionClick: (suggestion: string) => void;
  lastMessage?: string;
}

export const Suggestions: React.FC<SuggestionsProps> = ({
  projectId,
  onSuggestionClick,
  lastMessage,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!projectId) {
        setSuggestions([
          'Create a new web app',
          'Build a landing page',
          'Generate a dashboard',
        ]);
        return;
      }

      setLoading(true);
      try {
        const result = await contextAPI.getSuggestions(projectId, lastMessage);
        setSuggestions(result.suggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [projectId, lastMessage]);

  if (suggestions.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-t border-border bg-secondary/30">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Suggestions
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse">
            Loading suggestions...
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-xs rounded-full",
                "bg-secondary hover:bg-accent border border-border",
                "transition-colors cursor-pointer"
              )}
            >
              <Lightbulb className="w-3 h-3" />
              {suggestion}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
