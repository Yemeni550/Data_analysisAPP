import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ExtractionResult {
  productName?: string;
  sku?: string;
  category?: string;
  batchNumber?: string;
  expirationDate?: string;
  description?: string;
  confidence?: number;
}

export default function ImageUpload() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data.extractedData || {});
      toast({
        title: "Success",
        description: "Image processed successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to process image",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setExtractedData(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">AI Image Upload</h1>
        <p className="text-muted-foreground">Upload product images to automatically extract data using AI</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!previewUrl ? (
              <label
                htmlFor="image-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 transition-colors hover-elevate"
                data-testid="dropzone-upload"
              >
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium">Click to upload image</p>
                <p className="mt-2 text-xs text-muted-foreground">PNG, JPG, or JPEG up to 10MB</p>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-auto w-full object-contain"
                    data-testid="image-preview"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="flex-1"
                    data-testid="button-process-image"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Process with AI
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={uploadMutation.isPending}
                    data-testid="button-reset-upload"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extracted Data</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">Analyzing image with AI...</p>
              </div>
            ) : extractedData ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Data extracted successfully. Review and edit as needed.
                  </AlertDescription>
                </Alert>

                {extractedData.confidence && (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <span className="text-sm font-medium">Confidence</span>
                    <Badge variant={extractedData.confidence > 0.8 ? "default" : "secondary"}>
                      {Math.round(extractedData.confidence * 100)}%
                    </Badge>
                  </div>
                )}

                <div className="space-y-3">
                  {extractedData.productName && (
                    <div>
                      <Label>Product Name</Label>
                      <Input
                        value={extractedData.productName}
                        readOnly
                        data-testid="extracted-product-name"
                      />
                    </div>
                  )}

                  {extractedData.sku && (
                    <div>
                      <Label>SKU</Label>
                      <Input
                        value={extractedData.sku}
                        readOnly
                        className="font-mono"
                        data-testid="extracted-sku"
                      />
                    </div>
                  )}

                  {extractedData.category && (
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={extractedData.category}
                        readOnly
                        data-testid="extracted-category"
                      />
                    </div>
                  )}

                  {extractedData.batchNumber && (
                    <div>
                      <Label>Batch Number</Label>
                      <Input
                        value={extractedData.batchNumber}
                        readOnly
                        data-testid="extracted-batch"
                      />
                    </div>
                  )}

                  {extractedData.expirationDate && (
                    <div>
                      <Label>Expiration Date</Label>
                      <Input
                        value={extractedData.expirationDate}
                        readOnly
                        data-testid="extracted-expiration"
                      />
                    </div>
                  )}

                  {extractedData.description && (
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={extractedData.description}
                        readOnly
                        data-testid="extracted-description"
                      />
                    </div>
                  )}
                </div>

                <Button className="w-full" data-testid="button-create-from-extraction">
                  Create Inventory Item from Data
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Upload and process an image to see extracted data
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Tip:</strong> For best results, upload clear, well-lit images with visible product labels, 
          barcodes, and text. The AI will extract product names, SKUs, batch numbers, expiration dates, and more.
        </AlertDescription>
      </Alert>
    </div>
  );
}
