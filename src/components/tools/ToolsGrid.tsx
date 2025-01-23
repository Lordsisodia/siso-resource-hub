import { Tool } from './types';
import { ToolCard } from './ToolCard';
import { motion } from 'framer-motion';

interface ToolsGridProps {
  tools: Tool[];
  isLoading: boolean;
}

export function ToolsGrid({ tools, isLoading }: ToolsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className="h-48 rounded-lg bg-siso-text/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {tools.map((tool, index) => (
        <motion.div
          key={tool.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <ToolCard tool={tool} />
        </motion.div>
      ))}
    </div>
  );
}