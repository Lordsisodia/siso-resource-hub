
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Video } from '@/components/education/types';
import { useToast } from '@/hooks/use-toast';

export const useVideoDetail = (videoId: string) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['video', videoId],
    queryFn: async () => {
      if (!videoId) {
        console.error('[useVideoDetail] Invalid video ID');
        throw new Error('Invalid video ID');
      }

      console.log('[useVideoDetail] Fetching video data for ID:', videoId);

      const { data: videoDetails, error: videoError } = await supabase
        .from('youtube_videos')
        .select(`
          id,
          title,
          url,
          duration,
          thumbnailUrl,
          hd_thumbnail_url,
          viewCount,
          likes_count,
          comment_count,
          date,
          category_id,
          tags,
          full_description,
          language,
          has_captions,
          channel_id,
          education_creators!youtube_videos_channel_id_fkey (
            name,
            channel_avatar_url,
            description,
            subscriber_count_history,
            video_upload_frequency,
            video_count
          )
        `)
        .eq('id', videoId)
        .maybeSingle();

      if (videoError) {
        console.error('[useVideoDetail] Error fetching video:', videoError);
        throw videoError;
      }

      if (!videoDetails) {
        console.error('[useVideoDetail] No video found with ID:', videoId);
        throw new Error('Video not found');
      }

      // Get the latest subscriber count from history
      const subscriberCountHistory = videoDetails.education_creators?.subscriber_count_history as { count: number }[] || [];
      const latestSubscriberCount = subscriberCountHistory.length > 0
        ? subscriberCountHistory[subscriberCountHistory.length - 1].count
        : 0;

      // Transform database fields to match Video interface
      const transformedVideo: Video = {
        id: videoDetails.id,
        title: videoDetails.title,
        url: videoDetails.url,
        duration: videoDetails.duration,
        thumbnail_url: videoDetails.thumbnailUrl,
        hd_thumbnail_url: videoDetails.hd_thumbnail_url,
        created_at: videoDetails.date,
        language: videoDetails.language,
        has_captions: videoDetails.has_captions,
        category_id: videoDetails.category_id,
        full_description: videoDetails.full_description,
        tags: videoDetails.tags,
        educator: {
          name: videoDetails.education_creators?.name || 'Unknown Creator',
          avatar_url: videoDetails.education_creators?.channel_avatar_url || '',
          title: 'Content Creator',
          subscriber_count: latestSubscriberCount,
          video_count: videoDetails.education_creators?.video_count,
          upload_frequency: videoDetails.education_creators?.video_upload_frequency
        },
        metrics: {
          views: videoDetails.viewCount || 0,
          likes: videoDetails.likes_count || 0,
          comments: videoDetails.comment_count,
          sentiment_score: 0,
          difficulty: 'Intermediate',
          impact_score: 0,
          category: 'Education'
        },
        topics: [],
        ai_analysis: {
          key_takeaways: [],
          implementation_steps: []
        }
      };

      console.log('[useVideoDetail] Transformed video data:', transformedVideo);
      return transformedVideo;
    },
    meta: {
      onSettled: (data, error) => {
        if (error) {
          console.error('[useVideoDetail] Query error:', error);
          toast({
            title: "Error loading video",
            description: error.message || "The requested video could not be found or accessed.",
            variant: "destructive"
          });
        }
      }
    }
  });
};
