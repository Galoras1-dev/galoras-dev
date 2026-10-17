import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Image as ImageIcon, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Loader2,
  Download,
  Eye
} from "lucide-react";

// Define all images to generate with their prompts
const IMAGE_CONFIGS = [
  {
    pageName: "index",
    title: "Homepage Hero",
    prompt: "Abstract visualization of guidance and transformation, flowing light rays emerging from a central compass-like form, representing leadership journey and direction"
  },
  {
    pageName: "about",
    title: "About Page Hero",
    prompt: "Professional compass and navigation motif with interconnected glowing pathways, symbolizing strategic direction and purposeful leadership"
  },
  {
    pageName: "auth",
    title: "Auth Page Background",
    prompt: "Split composition design, dark navy gradient on left transitioning to bright ethereal blue light on right, symbolizing transformation and new beginnings"
  },
  {
    pageName: "apply",
    title: "Apply Page Hero",
    prompt: "Abstract ascending stairway or pathway reaching upward, with blue light accents showing progress and growth, representing career advancement"
  },
  {
    pageName: "contact",
    title: "Contact Page Hero",
    prompt: "Connected nodes and network visualization forming organic patterns, representing communication, connection, and collaboration"
  },
  {
    pageName: "not-found",
    title: "404 Page Background",
    prompt: "Ethereal compass lost in misty void, soft blue glow emanating from the center, mysterious and contemplative atmosphere"
  },
  {
    pageName: "coach-matching",
    title: "Coach Matching Hero",
    prompt: "Two distinct paths gracefully converging into one, abstract visualization of perfect alignment and connection between mentor and mentee"
  },
  {
    pageName: "coaching-directory",
    title: "Coaching Directory Hero",
    prompt: "Grid arrangement of abstract human silhouettes with individual blue auras, representing diverse expertise and professional community"
  },
  {
    pageName: "coach-profile",
    title: "Coach Profile Hero",
    prompt: "Abstract mentorship visualization with guiding light beam illuminating a path, representing one-on-one transformation and support"
  },
  {
    pageName: "why-coaching",
    title: "Why Coaching Hero",
    prompt: "Before and after transformation journey abstract, showing evolution from scattered fragments to harmonious unified form"
  },
  {
    pageName: "business",
    title: "Business Page Hero",
    prompt: "Corporate skyline silhouette with compass overlay and strategic grid lines, representing enterprise-level executive coaching"
  },
  {
    pageName: "diagnostics",
    title: "Diagnostics Page Hero",
    prompt: "Abstract diagnostic visualization with scanning grid and data analysis patterns, representing organizational assessment and insights"
  },
  {
    pageName: "leadership-circles",
    title: "Leadership Circles Hero",
    prompt: "Circular formation of abstract figures connected by glowing threads, representing peer groups and collective leadership wisdom"
  },
  {
    pageName: "workshops",
    title: "Workshops Page Hero",
    prompt: "Dynamic workshop environment abstract with collaborative energy patterns and interactive elements, representing group learning"
  },
  {
    pageName: "enterprise",
    title: "Enterprise Hero",
    prompt: "Abstract of a leadership team aligning: converging lines and clear paths, representing strategy turning into execution"
  }
];

type ImageStatus = 'pending' | 'generating' | 'success' | 'error';

interface ImageState {
  status: ImageStatus;
  url?: string;
  error?: string;
}

export default function ImageGenerator() {
  const { toast } = useToast();
  const [imageStates, setImageStates] = useState<Record<string, ImageState>>(() => {
    const initial: Record<string, ImageState> = {};
    IMAGE_CONFIGS.forEach(config => {
      initial[config.pageName] = { status: 'pending' };
    });
    return initial;
  });
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const updateImageState = (pageName: string, state: Partial<ImageState>) => {
    setImageStates(prev => ({
      ...prev,
      [pageName]: { ...prev[pageName], ...state }
    }));
  };

  const generateSingleImage = async (config: typeof IMAGE_CONFIGS[0]): Promise<boolean> => {
    updateImageState(config.pageName, { status: 'generating' });

    try {
      const { data, error } = await supabase.functions.invoke('generate-brand-image', {
        body: { prompt: config.prompt, pageName: config.pageName }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      updateImageState(config.pageName, { 
        status: 'success', 
        url: data.url 
      });

      return true;
    } catch (error) {
      console.error(`Error generating ${config.pageName}:`, error);
      updateImageState(config.pageName, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  };

  const generateAllImages = async () => {
    setIsGeneratingAll(true);
    setCurrentIndex(0);

    for (let i = 0; i < IMAGE_CONFIGS.length; i++) {
      setCurrentIndex(i);
      const config = IMAGE_CONFIGS[i];
      
      // Skip already successful images
      if (imageStates[config.pageName].status === 'success') {
        continue;
      }

      await generateSingleImage(config);
      
      // Small delay between generations to avoid rate limiting
      if (i < IMAGE_CONFIGS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGeneratingAll(false);
    
    const successCount = Object.values(imageStates).filter(s => s.status === 'success').length;
    toast({
      title: "Generation Complete",
      description: `Successfully generated ${successCount} of ${IMAGE_CONFIGS.length} images.`
    });
  };

  const getStatusIcon = (status: ImageStatus) => {
    switch (status) {
      case 'pending':
        return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
      case 'generating':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: ImageStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'generating':
        return <Badge className="bg-primary">Generating...</Badge>;
      case 'success':
        return <Badge className="bg-green-500">Complete</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const completedCount = Object.values(imageStates).filter(s => s.status === 'success').length;
  const progress = (completedCount / IMAGE_CONFIGS.length) * 100;

  return (
    <Layout>
      <div className="container-wide py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">Brand Image Generator</h1>
            <p className="text-muted-foreground">
              Generate custom AI images for all pages using the Galoras brand identity.
            </p>
          </div>

          {/* Progress & Actions */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">{completedCount} / {IMAGE_CONFIGS.length}</p>
                </div>
                <Button 
                  onClick={generateAllImages} 
                  disabled={isGeneratingAll}
                  size="lg"
                >
                  {isGeneratingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating ({currentIndex + 1}/{IMAGE_CONFIGS.length})
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate All Images
                    </>
                  )}
                </Button>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          {/* Image Grid */}
          <div className="grid gap-4">
            {IMAGE_CONFIGS.map((config) => {
              const state = imageStates[config.pageName];
              
              return (
                <Card key={config.pageName} className="overflow-hidden">
                  <div className="flex items-start gap-4 p-4">
                    {/* Thumbnail */}
                    <div className="w-32 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {state.url ? (
                        <img 
                          src={state.url} 
                          alt={config.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getStatusIcon(state.status)
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{config.title}</h3>
                        {getStatusBadge(state.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {config.prompt}
                      </p>
                      {state.error && (
                        <p className="text-sm text-destructive">{state.error}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {state.url && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(state.url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={state.url} download={`${config.pageName}-hero.png`}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateSingleImage(config)}
                        disabled={state.status === 'generating' || isGeneratingAll}
                      >
                        <RefreshCw className={`h-4 w-4 ${state.status === 'generating' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">How to Use Generated Images</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <ol>
                <li>Click "Generate All Images" to create all brand images at once</li>
                <li>Each image is automatically saved to storage with a public URL</li>
                <li>Use the storage URL format in your pages:
                  <code className="block mt-2 p-2 bg-muted rounded text-xs">
                    {`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/brand-images/[page-name]-hero.png`}
                  </code>
                </li>
                <li>Regenerate individual images by clicking the refresh icon</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
