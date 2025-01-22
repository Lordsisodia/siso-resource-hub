import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { NewsCardMedia } from './NewsCardMedia';
import { NewsCardContent } from './NewsCardContent';
import { NewsCardComments } from './NewsCardComments';
import { ShareButtons } from './ShareButtons';
import { Skeleton } from '@/components/ui/skeleton';

interface NewsCardProps {
  item: any;
  summaries: Record<string, string>;
  loadingSummaries: Record<string, boolean>;
  onGenerateSummary: (id: string) => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_email: string;
}

const NewsCard = ({ 
  item, 
  summaries, 
  loadingSummaries, 
  onGenerateSummary 
}: NewsCardProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const channel = supabase
      .channel('news-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'news_comments',
          filter: `news_id=eq.${item.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [...prev, payload.new as Comment]);
          }
        }
      )
      .subscribe();

    fetchComments();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [item.id]);

  const fetchComments = async () => {
    try {
      const { data } = await supabase
        .from('news_comments')
        .select('*')
        .eq('news_id', item.id)
        .order('created_at', { ascending: true });

      setComments(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[200px] rounded-lg" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="hover:bg-card/60 transition-colors duration-200 border-siso-border hover:border-siso-border-hover">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <NewsCardMedia imageUrl={item.image_url} title={item.title} />
            
            <div className="flex-1 space-y-3 sm:space-y-4">
              <NewsCardContent
                title={item.title}
                description={item.description}
                date={item.date}
                source={item.source}
                impact={item.impact}
              />

              <NewsCardComments
                newsId={item.id}
                comments={comments}
              />

              <div className="flex flex-wrap gap-2 sm:gap-4 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => !summaries[item.id] && onGenerateSummary(item.id)}
                      className="text-xs sm:text-sm hover:bg-siso-red/10 hover:text-siso-red transition-colors w-full sm:w-auto"
                    >
                      {loadingSummaries[item.id] ? (
                        "Generating Summary..."
                      ) : (
                        summaries[item.id] ? "View AI Summary" : "Generate AI Summary"
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>AI Summary & Share Options</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 sm:space-y-6 py-4">
                      {summaries[item.id] ? (
                        <div className="bg-card p-3 sm:p-4 rounded-lg border border-siso-red/20">
                          <p className="text-sm sm:text-base">{summaries[item.id]}</p>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          {loadingSummaries[item.id] ? "Generating summary..." : "Click the button to generate a summary"}
                        </div>
                      )}
                      
                      <ShareButtons summary={summaries[item.id] || ''} title={item.title} />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NewsCard;