
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Educator {
  id: string;
  name: string;
  channel_avatar_url: string;
  number_of_subscribers: number;
  specialization: string[];
}

interface FeaturedEducatorsProps {
  educators: Educator[] | undefined;
  isLoading: boolean;
}

export const FeaturedEducators = ({ educators, isLoading }: FeaturedEducatorsProps) => {
  // [Analysis] Early return if no educators to save space
  if (!educators?.length) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-32 rounded-xl bg-gradient-to-br from-white/5 to-transparent" 
          />
        ))}
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {educators.map((educator) => (
        <motion.div
          key={educator.id}
          variants={itemVariants}
          className="group relative flex items-start gap-4 p-4 rounded-xl 
            backdrop-blur-md bg-black/20 border border-white/10
            hover:border-siso-orange/30 transition-all duration-300
            hover:bg-white/5 cursor-pointer overflow-hidden
            hover:scale-[1.02]"
          whileHover={{ scale: 1.02 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-siso-red/5 to-siso-orange/5 opacity-0 
            group-hover:opacity-100 transition-opacity duration-300" />
          
          <Avatar className="h-16 w-16 rounded-xl ring-2 ring-siso-orange/20 
            group-hover:ring-siso-orange/40 transition-colors duration-300">
            <AvatarImage src={educator.channel_avatar_url} alt={educator.name} />
            <AvatarFallback className="bg-siso-bg text-lg font-medium">
              {educator.name[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-white truncate group-hover:text-transparent 
                group-hover:bg-clip-text group-hover:bg-gradient-to-r 
                group-hover:from-siso-red group-hover:to-siso-orange 
                transition-all duration-300">
                {educator.name}
              </h4>
              <Badge variant="secondary" className="bg-gradient-to-r from-siso-red/20 to-siso-orange/20 
                text-siso-orange text-xs border border-siso-orange/20">
                Featured
              </Badge>
            </div>

            <p className="text-sm text-siso-text/60 mt-1 flex items-center gap-1.5">
              <span>{formatNumber(educator.number_of_subscribers)}</span>
              <span className="text-siso-text/40">•</span>
              <span>subscribers</span>
            </p>

            {educator.specialization && (
              <div className="flex flex-wrap gap-2 mt-2">
                {educator.specialization.slice(0, 2).map((spec) => (
                  <span
                    key={spec}
                    className="px-2 py-0.5 text-xs rounded-full 
                      bg-gradient-to-r from-siso-red/10 to-siso-orange/10 
                      text-siso-text/90 border border-white/10 
                      group-hover:border-siso-orange/20 group-hover:text-white
                      transition-colors duration-300"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}

            <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 
              text-siso-text/40 group-hover:text-siso-orange transition-colors duration-300
              group-hover:translate-x-1" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
