
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { supabaseClient } from "../_shared/supabase-client.ts";

// [Analysis] Configure environment variables for API access
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openAIKey = Deno.env.get("OPENAI_API_KEY");

// [Analysis] Type definitions for better code organization and error checking
interface RequestBody {
  date?: string;
  forceRefresh?: boolean;
}

interface NewsArticle {
  title: string;
  description: string;
  source: string;
  category: string;
  impact: string;
}

interface SummaryResponse {
  success: boolean;
  summary?: string;
  key_points?: string[];
  practical_applications?: string[];
  industry_impacts?: Record<string, string>;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// [Framework] Check for existing summary first
async function getExistingSummary(supabase: any, date: string): Promise<any> {
  try {
    const { data: existingSummary, error: fetchError } = await supabase
      .from("ai_news_daily_summaries")
      .select("*")
      .eq("date", date)
      .maybeSingle();
      
    if (fetchError) {
      console.error("Error checking for existing summary:", fetchError);
      return { error: fetchError };
    }
    
    return { data: existingSummary };
  } catch (error) {
    console.error("Unexpected error in getExistingSummary:", error);
    return { error };
  }
}

// [Framework] Fetch articles for summary generation
async function fetchArticles(supabase: any, date: string): Promise<{ data?: NewsArticle[], error?: Error }> {
  try {
    const { data: articles, error: articlesError } = await supabase
      .from("ai_news")
      .select("*")
      .eq("date", date)
      .eq("status", "published")
      .order("created_at", { ascending: false });
      
    if (articlesError) {
      return { error: new Error(`Error fetching news articles: ${articlesError.message}`) };
    }
    
    if (!articles || articles.length === 0) {
      return { error: new Error(`No published articles found for ${date}`) };
    }
    
    console.log(`Found ${articles.length} articles for ${date}`);
    
    // Prepare articles data
    const articlesData = articles.map(article => ({
      title: article.title,
      description: article.description,
      source: article.source,
      category: article.category,
      impact: article.impact
    }));
    
    return { data: articlesData };
  } catch (error) {
    console.error("Unexpected error in fetchArticles:", error);
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// [Analysis] Generate a placeholder summary when OpenAI is unavailable
function generatePlaceholderSummary(date: string, articleCount: number): any {
  return {
    summary: `Daily AI News Summary for ${date}. ${articleCount} articles published covering various AI topics and industry developments.`,
    key_points: [
      "Multiple articles published about AI advancements and implementations",
      "Coverage spans different AI applications and technologies across sectors",
      "Various industries represented in today's AI news coverage",
      "Technical and business perspectives on AI developments included",
      "Latest AI research and commercial applications featured"
    ],
    practical_applications: [
      "Stay informed about the latest AI developments in your industry",
      "Consider how these technologies might apply to your organization's challenges",
      "Watch for emerging trends across AI applications to inform strategy",
      "Identify potential partners or technologies worth exploring further"
    ],
    industry_impacts: {
      "technology": "Ongoing advancements in AI capabilities and infrastructure",
      "business": "Potential productivity improvements through AI adoption and integration",
      "research": "New findings contributing to AI development and capabilities",
      "healthcare": "Applications of AI in improving patient care and outcomes",
      "education": "Developments in AI tools for personalized learning and education"
    },
    generated_with: "placeholder"
  };
}

// [Framework] Call OpenAI API to generate summary with retry logic
async function callOpenAI(prompt: string, maxRetries = 2): Promise<{ data?: any, error?: Error }> {
  if (!openAIKey) {
    console.error("OpenAI API key not available");
    return { error: new Error("OpenAI API key not available") };
  }
  
  // Verify API key format for debugging (don't log the actual key)
  console.log(`OpenAI API key available and has length: ${openAIKey.length}`);
  if (openAIKey.startsWith("sk-") === false) {
    console.warn("Warning: OpenAI API key does not start with expected prefix 'sk-'");
  }
  
  let retryCount = 0;
  let lastError: Error | null = null;
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        // Exponential backoff: wait longer between each retry
        const delayMs = Math.pow(2, retryCount) * 1000;
        console.log(`Retry attempt ${retryCount} after ${delayMs}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      console.log(`API call attempt ${retryCount + 1}/${maxRetries + 1}`);
      console.log("Sending request to OpenAI API...");
      console.log("Using model: gpt-4o-mini");
      
      const requestBody = JSON.stringify({
        model: "gpt-4o-mini", // [Analysis] Using gpt-4o-mini which is a valid model
        messages: [
          {
            role: "system",
            content: "You are an AI analyst that summarizes artificial intelligence news and identifies key trends, applications, and implications."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });
      
      console.log(`Request body: ${requestBody.substring(0, 200)}...`);
      
      const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`
        },
        body: requestBody
      });
      
      // [Plan] Enhanced error logging for API responses
      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error("OpenAI API error response status:", openAIResponse.status);
        console.error("OpenAI API error response body:", errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          const errorMessage = errorData.error?.message || errorData.error?.type || openAIResponse.statusText;
          console.error(`Parsed API error: ${errorMessage}`);
          
          // If we received a rate limit or server error, retry
          if (openAIResponse.status === 429 || openAIResponse.status >= 500) {
            lastError = new Error(`OpenAI API error (${openAIResponse.status}): ${errorMessage}`);
            retryCount++;
            continue; // Continue to next retry attempt
          }
          
          throw new Error(`OpenAI API error: ${errorMessage}`);
        } catch (e) {
          throw new Error(`OpenAI API error: ${openAIResponse.statusText} - ${errorText.substring(0, 200)}`);
        }
      }
      
      const openAIData = await openAIResponse.json();
      console.log("Successfully received OpenAI response");
      console.log(`Response status: ${openAIResponse.status}`);
      console.log(`Response contains choices: ${openAIData.choices ? openAIData.choices.length : 0}`);
      
      if (!openAIData.choices || !openAIData.choices[0]?.message?.content) {
        console.error("Response missing expected content:", JSON.stringify(openAIData).substring(0, 500));
        throw new Error("OpenAI response missing expected content");
      }
      
      return { data: openAIData };
    } catch (error) {
      console.error(`Error calling OpenAI API (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (retryCount >= maxRetries) {
        return { error: lastError };
      }
      
      retryCount++;
    }
  }
  
  // This should never be reached due to the return in the loop, but TypeScript needs it
  return { error: lastError || new Error("Unknown error in OpenAI API call") };
}

// [Framework] Parse the OpenAI response into structured summary data
function parseOpenAIResponse(responseContent: string): any {
  try {
    // Log the raw response for debugging
    console.log("Raw OpenAI response to parse:", responseContent.substring(0, 300) + "...");
    
    // Extract JSON from the response (handling potential markdown formatting)
    const jsonMatch = responseContent.match(/```json\n([\s\S]*)\n```/) || 
                     responseContent.match(/```\n([\s\S]*)\n```/) ||
                     [null, responseContent];
                      
    const jsonString = jsonMatch[1] || responseContent;
    console.log("Attempting to parse OpenAI response:", jsonString.substring(0, 150) + "...");
    
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      // First parse attempt failed, try cleanup and retry
      console.warn("Initial JSON parse failed, trying with cleanup:", parseError);
      
      // Try to clean up the string more aggressively
      const cleanedString = jsonString
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/\\n/g, " ")  // Replace newlines with spaces
        .replace(/\\/g, "\\\\") // Escape backslashes
        .replace(/\\"/g, '\\"')  // Fix escaped quotes
        .trim();
        
      try {
        return JSON.parse(cleanedString);
      } catch (secondParseError) {
        console.error("Cleaned JSON parse also failed:", secondParseError);
        throw parseError; // Throw the original error
      }
    }
  } catch (parseError) {
    console.error("Error parsing OpenAI response:", parseError);
    console.log("Raw response that failed parsing:", responseContent);
    
    // Attempt to extract data using regex as a fallback
    const summary = responseContent.match(/summary["\s:]+([^"]+)/i)?.[1] || 
                   `AI News Summary`;
                    
    const keyPointsMatch = responseContent.match(/key_points["\s:]+\[([\s\S]*?)\]/i)?.[1] || "";
    const keyPoints = keyPointsMatch
      .split(/,\s*"/)
      .map(p => p.replace(/^"/, "").replace(/"$/, "").trim())
      .filter(p => p.length > 0);
      
    const applicationsMatch = responseContent.match(/practical_applications["\s:]+\[([\s\S]*?)\]/i)?.[1] || "";
    const applications = applicationsMatch
      .split(/,\s*"/)
      .map(p => p.replace(/^"/, "").replace(/"$/, "").trim())
      .filter(p => p.length > 0);
      
    return {
      summary,
      key_points: keyPoints.length > 0 ? keyPoints : ["Important AI developments reported today"],
      practical_applications: applications.length > 0 ? applications : ["Stay informed on AI advancements"],
      industry_impacts: { "technology": "Ongoing progress in AI capabilities" }
    };
  }
}

// [Framework] Save the summary to the database
async function saveSummary(supabase: any, date: string, summaryData: any, articleCount: number, generatedWith: string): Promise<{ error?: Error }> {
  try {
    console.log(`Saving summary for ${date} with generation method: ${generatedWith}`);
    
    // First check if summary already exists
    const { data: existingSummary } = await getExistingSummary(supabase, date);
    
    // Add better response logging for debugging
    console.log("Summary data being saved:", {
      date,
      summary_length: summaryData.summary?.length || 0,
      key_points_count: summaryData.key_points?.length || 0,
      generated_with: generatedWith,
      articleCount,
      has_existing: !!existingSummary
    });
    
    // Ensure the data structure is valid
    if (!summaryData.summary || typeof summaryData.summary !== 'string') {
      console.error("Invalid summary data - summary missing or not a string:", summaryData);
      return { error: new Error("Invalid summary data structure - missing required fields") };
    }
    
    let saveOperation;
    
    if (existingSummary) {
      // Update existing summary
      console.log(`Updating existing summary for ${date}`);
      saveOperation = supabase
        .from("ai_news_daily_summaries")
        .update({
          summary: summaryData.summary,
          key_points: summaryData.key_points || [],
          practical_applications: summaryData.practical_applications || [],
          industry_impacts: summaryData.industry_impacts || {},
          generated_with: generatedWith,
          article_count: articleCount,
          updated_at: new Date().toISOString()
        })
        .eq("date", date);
    } else {
      // Insert new summary
      console.log(`Inserting new summary for ${date}`);
      saveOperation = supabase
        .from("ai_news_daily_summaries")
        .insert({
          date,
          summary: summaryData.summary,
          key_points: summaryData.key_points || [],
          practical_applications: summaryData.practical_applications || [],
          industry_impacts: summaryData.industry_impacts || {},
          generated_with: generatedWith,
          article_count: articleCount
        });
    }
    
    const { error: saveError } = await saveOperation;
      
    if (saveError) {
      console.error("Error saving summary:", saveError);
      return { error: new Error(`Failed to save summary: ${saveError.message}`) };
    }
    
    console.log(`Successfully saved summary for ${date}`);
    return {};
  } catch (error) {
    console.error("Error in saveSummary:", error);
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// [Framework] Main function to generate a daily summary
async function generateDailySummary(date: string, forceRefresh: boolean = false): Promise<SummaryResponse> {
  try {
    console.log(`⭐️ Starting daily summary generation for ${date}, force refresh: ${forceRefresh}`);
    
    // Initialize Supabase client
    const supabase = supabaseClient || createClient(supabaseUrl!, supabaseKey!);
    
    // Check if we already have a summary for this date
    if (!forceRefresh) {
      const { data: existingSummary, error } = await getExistingSummary(supabase, date);
      
      if (error) {
        console.warn("Error checking for existing summary, proceeding with generation:", error);
      } else if (existingSummary) {
        console.log(`Using existing summary for ${date}`);
        
        // Don't return error_fallback summaries unless forced to
        if (existingSummary.generated_with === 'error_fallback' || existingSummary.generated_with === 'placeholder') {
          console.log("Existing summary is a fallback/placeholder. Will regenerate unless forced.");
          
          // If user is not forcing refresh of a fallback, we'll regenerate
          if (!forceRefresh) {
            // Delete the fallback summary before regenerating
            const { error: deleteError } = await supabase
              .from("ai_news_daily_summaries")
              .delete()
              .eq("date", date);
              
            if (deleteError) {
              console.warn("Failed to delete fallback summary:", deleteError);
            } else {
              console.log("Successfully deleted fallback summary. Will regenerate.");
            }
            
            // Continue with generation (don't return here)
          } else {
            // User specifically asked for this fallback, so use it
            return {
              success: true,
              summary: existingSummary.summary,
              key_points: existingSummary.key_points || [],
              practical_applications: existingSummary.practical_applications || [],
              industry_impacts: existingSummary.industry_impacts || {}
            };
          }
        } else {
          // This is a valid summary, return it
          return {
            success: true,
            summary: existingSummary.summary,
            key_points: existingSummary.key_points || [],
            practical_applications: existingSummary.practical_applications || [],
            industry_impacts: existingSummary.industry_impacts || {}
          };
        }
      }
    }
    
    // Fetch today's news articles
    const { data: articles, error: articlesError } = await fetchArticles(supabase, date);
    
    if (articlesError) {
      return {
        success: false,
        error: articlesError.message
      };
    }
    
    // Check if OpenAI API key is available
    if (!openAIKey) {
      console.warn("OpenAI API key not available. Using placeholder summary.");
      
      // Generate a basic summary without OpenAI
      const placeholderSummary = generatePlaceholderSummary(date, articles.length);
      
      // Save the placeholder summary
      const { error: saveError } = await saveSummary(
        supabase, 
        date, 
        placeholderSummary, 
        articles.length, 
        "placeholder"
      );
      
      if (saveError) {
        console.error("Error saving placeholder summary:", saveError);
      }
      
      return {
        success: true,
        summary: placeholderSummary.summary,
        key_points: placeholderSummary.key_points,
        practical_applications: placeholderSummary.practical_applications,
        industry_impacts: placeholderSummary.industry_impacts,
        error: "AI-enhanced summary unavailable. Using basic summary instead."
      };
    }
    
    // Log that we're using a valid API key
    console.log("OpenAI API key is available, proceeding with AI-generated summary");
    
    // Use OpenAI to generate the summary
    const prompt = `
You are an AI news analyst specializing in artificial intelligence trends. 
Analyze these ${articles.length} articles about AI from ${date} and create a comprehensive summary:

${JSON.stringify(articles, null, 2)}

Please provide:
1. A concise executive summary (2-3 paragraphs) of today's AI news
2. 5-7 key points highlighting the most important developments
3. 3-5 practical applications for professionals in different industries
4. Industry impact assessment (technology, business, healthcare, education, etc.)

Format your response as JSON with these keys: 
summary (string), key_points (array), practical_applications (array), industry_impacts (object with industry names as keys and impact descriptions as values)
`;

    // Call OpenAI API with retry logic
    const { data: openAIData, error: openAIError } = await callOpenAI(prompt);
    
    if (openAIError) {
      console.error("Error calling OpenAI after all retries:", openAIError);
      
      // Fall back to placeholder if OpenAI fails
      const placeholderSummary = generatePlaceholderSummary(date, articles.length);
      await saveSummary(supabase, date, placeholderSummary, articles.length, "error_fallback");
      
      return {
        success: true,
        summary: placeholderSummary.summary,
        key_points: placeholderSummary.key_points,
        practical_applications: placeholderSummary.practical_applications,
        industry_impacts: placeholderSummary.industry_impacts,
        error: `Generated fallback summary due to API error: ${openAIError.message}`
      };
    }
    
    const responseContent = openAIData.choices[0]?.message?.content;
    
    if (!responseContent) {
      console.error("Empty response from OpenAI:", openAIData);
      throw new Error("Empty response from OpenAI");
    }
    
    // Parse the JSON response
    const summaryData = parseOpenAIResponse(responseContent);
    
    // Verify the parsed data has all required fields
    if (!summaryData.summary || !summaryData.key_points) {
      console.error("Parsed summary data missing required fields:", summaryData);
      throw new Error("Parsed summary data missing required fields");
    }
    
    // Save the summary to the database
    const { error: saveError } = await saveSummary(
      supabase, 
      date, 
      summaryData, 
      articles.length, 
      "openai"
    );
    
    if (saveError) {
      console.warn("Error saving summary, but returning generated data:", saveError);
    }
    
    console.log("✅ Successfully generated and saved summary");
    
    return {
      success: true,
      summary: summaryData.summary,
      key_points: summaryData.key_points,
      practical_applications: summaryData.practical_applications,
      industry_impacts: summaryData.industry_impacts
    };
  } catch (error) {
    console.error("Error generating daily summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// [Framework] Main handler for HTTP requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the request
    let requestBody: RequestBody = {};
    
    try {
      requestBody = await req.json();
    } catch (e) {
      // If parsing fails, use default empty object
      console.warn("Failed to parse request body, using defaults");
    }
    
    // Get the date parameter, defaulting to today
    const targetDate = requestBody.date || new Date().toISOString().split('T')[0];
    const forceRefresh = requestBody.forceRefresh || false;
    
    console.log(`----- GENERATING SUMMARY -----`);
    console.log(`Date: ${targetDate}, Force refresh: ${forceRefresh}`);
    console.log(`OpenAI API key: ${openAIKey ? "Available" : "Not available"}`);
    console.log(`---------------------------`);
    
    // Generate the summary
    const result = await generateDailySummary(targetDate, forceRefresh);
    
    // Return appropriate response
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: result.success ? 200 : 500
      }
    );
  } catch (error) {
    console.error("Unhandled error in generate-daily-summary:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});
