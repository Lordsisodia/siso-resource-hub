
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// [Analysis] Enhanced interface for the daily summary data with proper types
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
  
  // Enhanced data structure
  sentiment?: string;
  confidence_score?: number;
  categorized_key_points?: Record<string, string[]>;
  key_technologies?: Array<{
    name: string;
    description: string;
    maturity?: string;
    adoption_rate?: number;
  }>;
  application_details?: string[];
  impact_severity?: Record<string, string>;
  impact_trends?: Record<string, string>;
  analysis_depth?: string;
}

export function useAiDailySummary(date: string, isAdmin: boolean = false) {
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // [Analysis] Fetch the summary for the given date using a direct query instead of RPC
  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching summary for date: ${date}`);
      
      // Use direct query instead of RPC
      const { data, error: fetchError } = await supabase
        .from('ai_news_daily_summaries')
        .select('*')
        .eq('date', date)
        .maybeSingle();
      
      if (fetchError) {
        if (fetchError.code !== 'PGRST116') { // Not found is expected and not an error to show
          console.error('Error fetching summary:', fetchError);
          setError('Failed to load daily summary');
          toast({
            title: "Error",
            description: "Failed to load daily summary. Please try again.",
            variant: "destructive",
          });
        }
      } else if (data) {
        console.log('Summary data retrieved:', data);
        handleSummaryData(data);
      } else {
        console.log('No summary found for date:', date);
      }
    } catch (error) {
      console.error('Error in fetchSummary:', error);
      setError('Failed to load summary data');
    } finally {
      setLoading(false);
    }
  }, [date, toast]);
  
  // Helper to handle the summary data formatting
  const handleSummaryData = (data: any) => {
    // Convert industry_impacts from JSON to proper Record type
    const formattedData: DailySummaryData = {
      ...data,
      industry_impacts: data.industry_impacts as Record<string, string>,
      key_points: data.key_points || [],
      practical_applications: data.practical_applications || [],
      
      // Handle enhanced data fields
      sentiment: data.sentiment,
      confidence_score: data.confidence_score,
      categorized_key_points: data.categorized_key_points,
      key_technologies: data.key_technologies,
      application_details: data.application_details,
      impact_severity: data.impact_severity,
      impact_trends: data.impact_trends,
      analysis_depth: data.analysis_depth || 'standard',
    };
    
    setSummaryData(formattedData);
    
    // If this was a fallback summary due to API error, show a notification
    if (data.generated_with === 'error_fallback' || data.generated_with === 'placeholder') {
      setError('AI-enhanced summary unavailable. Using basic summary instead.');
      
      if (isAdmin) {
        toast({
          title: 'API Issue Detected',
          description: 'Using fallback summary as AI service encountered an issue. Check edge function logs for details.',
          variant: 'destructive',
        });
      }
    }
  };
  
  // [Analysis] Generate a new summary for the date with improved error handling and retries
  const generateSummary = async (forceRefresh = false) => {
    if (!isAdmin) return;
    
    try {
      setGenerating(true);
      setError(null);
      
      console.log(`Invoking edge function for date: ${date}, forceRefresh: ${forceRefresh}`);
      
      // First, clear existing fallback summary if it exists and we're doing a force refresh
      if (forceRefresh && summaryData?.generated_with === 'error_fallback') {
        const { error: deleteError } = await supabase
          .from('ai_news_daily_summaries')
          .delete()
          .eq('date', date);
          
        if (deleteError) {
          console.warn("Could not delete existing fallback summary:", deleteError);
        } else {
          console.log("Deleted existing fallback summary for regeneration");
        }
      }
      
      // Invoke the edge function with proper error handling and detailed logging
      console.log("Calling Supabase function: generate-daily-summary with payload:", {
        date,
        forceRefresh,
        enhancedAnalysis: true, // Always request enhanced analysis with additional metadata
      });
      
      try {
        // Add a timestamp to avoid caching issues with the Edge Function
        const timestamp = new Date().getTime();
        
        const { data, error: invokeError } = await supabase.functions.invoke('generate-daily-summary', {
          body: { 
            date,
            forceRefresh,
            enhancedAnalysis: true, // Always send flag to enable enhanced analysis
            timestamp, // Add timestamp to avoid caching
          },
        });
        
        console.log("Edge function response received:", data);
        
        if (invokeError) {
          console.error("Edge function invoke error:", invokeError);
          throw new Error(`Edge function error: ${invokeError.message}`);
        }
        
        if (!data || !data.success) {
          const errorMsg = data?.error || 'Failed to generate summary';
          console.error("Generate summary error:", errorMsg);
          throw new Error(errorMsg);
        }
        
        // Check if this was a fallback/placeholder summary
        if (data.error && data.error.includes('API error')) {
          setError('AI service unavailable. Using basic summary instead.');
          toast({
            title: 'API Issue Detected',
            description: 'Using fallback summary as AI service encountered an issue. Check edge function logs for details.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Success',
            description: forceRefresh 
              ? 'Daily summary has been regenerated' 
              : 'Daily summary has been generated',
          });
        }
      } catch (error) {
        console.error("Function invoke error:", error);
        
        // If the edge function fails, create a placeholder summary client-side
        const placeholderSummary = {
          date,
          summary: `Daily summary for ${date}. We're experiencing issues with our AI service. Please try again later.`,
          key_points: [
            "Summary temporarily unavailable",
            "Please try refreshing in a few minutes",
            "Our team has been notified of the issue"
          ],
          practical_applications: [
            "Check back later for the full summary"
          ],
          industry_impacts: {
            "general": "Impact analysis will be available when service is restored"
          },
          article_count: 0,
          created_at: new Date().toISOString(),
          generated_with: "client_fallback"
        };
        
        setSummaryData(placeholderSummary as DailySummaryData);
        setError('Generated fallback summary due to service issues.');
        
        toast({
          title: 'Summary Generation Issue',
          description: 'Created a temporary summary due to service issues. Please try again later.',
          variant: 'destructive',
        });
      }
      
      // Refetch the summary from the database to get all fields
      await fetchSummary();
      
    } catch (error) {
      console.error('Error generating summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate summary',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  // [Analysis] Automatically fetch summary when component mounts or date changes
  useEffect(() => {
    if (date) {
      fetchSummary();
    }
  }, [date, fetchSummary]);

  return {
    summaryData,
    loading,
    generating,
    error,
    fetchSummary,
    generateSummary
  };
}
