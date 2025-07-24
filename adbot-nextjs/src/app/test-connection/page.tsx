'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Server } from 'lucide-react';

export default function TestConnectionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const testConnection = async () => {
    setIsLoading(true);
    setConnectionStatus('idle');
    setMessage('');
    setError('');

    try {
      const response = await apiService.testConnection();
      
      if (response.error) {
        setConnectionStatus('error');
        setError(response.error);
      } else {
        setConnectionStatus('success');
        setMessage(response.data?.message || 'Connection successful');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Test connection on page load
    testConnection();
  }, []);

  return (
    <MainLayout>
      <div className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              API Connection Test
            </CardTitle>
            <CardDescription>
              Test the connection to your FastAPI backend running on port 8000
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Backend Status:</span>
                {connectionStatus === 'idle' && (
                  <Badge variant="secondary">Testing...</Badge>
                )}
                {connectionStatus === 'success' && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {connectionStatus === 'error' && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
              
              <Button 
                onClick={testConnection} 
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Again'
                )}
              </Button>
            </div>

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">{message}</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm font-medium">Error:</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-sm mb-2">Connection Details:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Backend URL: <code className="bg-gray-200 px-1 rounded">http://127.0.0.1:8000</code></li>
                <li>• Frontend URL: <code className="bg-gray-200 px-1 rounded">http://localhost:3000</code></li>
                <li>• API Proxy: <code className="bg-gray-200 px-1 rounded">/api/* → http://127.0.0.1:8000/*</code></li>
              </ul>
            </div>

            {connectionStatus === 'error' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h3 className="font-medium text-yellow-800 text-sm mb-2">Troubleshooting:</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Make sure your FastAPI backend is running on port 8000</li>
                  <li>• Check if the backend is accessible at http://127.0.0.1:8000</li>
                  <li>• Verify CORS settings in your FastAPI app</li>
                  <li>• Check the browser console for additional error details</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </MainLayout>
  );
} 