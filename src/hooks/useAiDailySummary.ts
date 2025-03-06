
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// [Analysis] Interface for the daily summary data with proper types
export interface DailySummaryData {
  id?: string;
  date: string;
  summary: string;
  key_points: string[];
  practical_applications: string[];
  industry_impacts: Record<string, string>;
  article_count: number;
  created_at: string;
  generated_with: string;
}

export function useAiDailySummary(date: string, isAdmin: boolean = false) {
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  
  // [Analysis] Fetch the summary for the given date
  const fetchSummary = async () => {
    try {
      setLoading(true);
      
      // [Framework] Direct table query approach that works with TypeScript
      const { data, error } = await supabase
        .from('ai_news_daily_summaries')
        .select('*')
        .eq('date', date)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching summary:', error);
        toast({
          title: 'Error',
          description: 'Failed to load daily summary. Please try again.',
          variant: 'destructive',
        });
      } else if (data) {
        setSummaryData(data as DailySummaryData);
      }
    } catch (error) {
      console.error('Error in fetchSummary:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // [Analysis] Generate a new summary for the date
  const generateSummary = async (forceRefresh = false) => {
    if (!isAdmin) return;
    
    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-daily-summary', {
        body: { 
          date,
          forceRefresh
        },
      });
      
      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate summary');
      }
      
      // Refetch the summary from the database to get all fields
      await fetchSummary();
      
      toast({
        title: 'Success',
        description: forceRefresh 
          ? 'Daily summary has been regenerated' 
          : 'Daily summary has been generated',
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate summary',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return {
    summaryData,
    loading,
    generating,
    fetchSummary,
    generateSummary
  };
}
