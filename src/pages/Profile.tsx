import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileInfo } from '@/components/profile/ProfileInfo';
import { PointsHistory } from '@/components/profile/PointsHistory';
import { LoginStreakTracker } from '@/components/points/LoginStreakTracker';
import { PointsDisplay } from '@/components/points/PointsDisplay';
import { MintNFTButton } from '@/components/crypto/MintNFTButton';
import { FloatingOrbs } from '@/components/effects/FloatingOrbs';
import { ConnectWalletButton } from '@/components/crypto/ConnectWalletButton';

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    businessType: '',
    industry: '',
    interests: '',
    bio: '',
    linkedinUrl: '',
    websiteUrl: '',
    youtubeUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    professionalRole: '',
  });

  const getProfile = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Profile] Session error:', sessionError);
        throw sessionError;
      }
      
      if (!session) {
        console.log('[Profile] No session found, redirecting to home');
        navigate('/');
        return;
      }

      console.log('[Profile] Session found:', session.user.id);
      setUser(session.user);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('[Profile] Profile fetch error:', profileError);
        throw profileError;
      }

      if (profileData) {
        console.log('[Profile] Profile data found:', profileData);
        setProfile(profileData);
        setFormData({
          fullName: profileData.full_name || '',
          businessName: profileData.business_name || '',
          businessType: profileData.business_type || '',
          industry: profileData.industry || '',
          interests: Array.isArray(profileData.interests) ? profileData.interests.join(', ') : '',
          bio: profileData.bio || '',
          linkedinUrl: profileData.linkedin_url || '',
          websiteUrl: profileData.website_url || '',
          youtubeUrl: profileData.youtube_url || '',
          instagramUrl: profileData.instagram_url || '',
          twitterUrl: profileData.twitter_url || '',
          professionalRole: profileData.professional_role || '',
        });
      }
    } catch (error: any) {
      console.error('[Profile] Error in getProfile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile data",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    getProfile();
  }, [getProfile]);

  const handleFormChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gradient-to-b from-siso-bg to-siso-bg/95">
          <Sidebar />
          <div className="flex-1 p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-siso-text/10 rounded w-1/4"></div>
              <div className="h-32 bg-siso-text/10 rounded"></div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!user || !profile) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gradient-to-b from-siso-bg to-siso-bg/95">
          <Sidebar />
          <div className="flex-1 container mx-auto px-4 py-8">
            <div className="text-center text-siso-text">
              <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
              <p>Unable to load profile data. Please try again later.</p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-b from-siso-bg to-siso-bg/95">
        <Sidebar />
        <div className="flex-1 relative">
          <FloatingOrbs />
          <div className="container mx-auto px-4 py-8 relative z-10">
            <div className="space-y-8 max-w-7xl mx-auto">
              <div className="bg-black/20 rounded-xl p-6 backdrop-blur-sm border border-siso-text/10">
                <ProfileHeader
                  fullName={profile?.full_name}
                  email={user?.email}
                  points={profile?.points || 0}
                  rank={profile?.rank || 'Bronze'}
                  avatarUrl={profile?.avatar_url}
                  onLogout={async () => {
                    try {
                      const { error } = await supabase.auth.signOut();
                      if (error) throw error;
                      navigate('/');
                    } catch (error: any) {
                      toast({
                        variant: "destructive",
                        title: "Error signing out",
                        description: error.message,
                      });
                    }
                  }}
                  onBackToHome={() => navigate('/')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {user && (
                  <div className="md:col-span-3">
                    <LoginStreakTracker userId={user.id} />
                  </div>
                )}
                
                {user && (
                  <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-black/20 rounded-xl p-6 backdrop-blur-sm border border-siso-text/10 hover:border-siso-orange/50 transition-colors">
                      <PointsDisplay userId={user.id} />
                    </div>
                    
                    <div className="bg-black/20 rounded-xl p-6 backdrop-blur-sm border border-siso-text/10 hover:border-siso-orange/50 transition-colors">
                      <ConnectWalletButton />
                    </div>

                    {profile?.solana_wallet_address && (
                      <div className="bg-black/20 rounded-xl p-6 backdrop-blur-sm border border-siso-text/10 hover:border-siso-orange/50 transition-colors">
                        <MintNFTButton />
                      </div>
                    )}
                  </div>
                )}

                <div className="md:col-span-2">
                  <ProfileInfo
                    email={user?.email}
                    fullName={profile?.full_name}
                    points={profile?.points || 0}
                    rank={profile?.rank || 'Bronze'}
                    businessName={profile?.business_name}
                    businessType={profile?.business_type}
                    industry={profile?.industry}
                    interests={profile?.interests}
                    bio={profile?.bio}
                    linkedinUrl={profile?.linkedin_url}
                    websiteUrl={profile?.website_url}
                    youtubeUrl={profile?.youtube_url}
                    instagramUrl={profile?.instagram_url}
                    twitterUrl={profile?.twitter_url}
                    professionalRole={profile?.professional_role}
                    isEditing={isEditing}
                    formData={formData}
                    onFormChange={handleFormChange}
                  />
                </div>
                
                <div className="md:col-span-1">
                  {user && <PointsHistory userId={user.id} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Profile;
