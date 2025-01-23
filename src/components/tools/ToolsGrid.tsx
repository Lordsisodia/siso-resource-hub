import { Tool } from './types';
import { ToolCard } from './ToolCard';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolsGridProps {
  tools: Tool[];
  isLoading: boolean;
}

export function ToolsGrid({ tools, isLoading }: ToolsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="h-[200px] rounded-lg bg-siso-text/5 animate-pulse border border-siso-text/10"
          />
        ))}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool, index) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="h-full"
          >
            <ToolCard tool={tool} />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}