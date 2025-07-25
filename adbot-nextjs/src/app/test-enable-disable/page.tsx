'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { usersService } from '@/lib/services/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function TestEnableDisablePage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const testOperation = async (operation: string) => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let response;
      
      switch (operation) {
        case 'enable':
          response = await usersService.enableUser(username);
          break;
        case 'force-enable':
          response = await usersService.forceEnableUser(username);
          break;
        case 'disable':
          response = await usersService.disableUser(username);
          break;
        case 'status':
          response = await usersService.getUserStatus(username);
          break;
        case 'reset-enable':
          response = await usersService.resetAndEnableUser(username);
          break;
        default:
          throw new Error('Invalid operation');
      }

      if (response.error) {
        setError(JSON.stringify(response.error, null, 2));
      } else {
        setResult(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Enable/Disable Functionality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username:</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g., aaaa)"
                className="max-w-md"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => testOperation('status')}
                disabled={loading}
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Get Status
              </Button>
              <Button
                onClick={() => testOperation('enable')}
                disabled={loading}
                variant="default"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enable
              </Button>
              <Button
                onClick={() => testOperation('force-enable')}
                disabled={loading}
                variant="secondary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Force Enable
              </Button>
              <Button
                onClick={() => testOperation('disable')}
                disabled={loading}
                variant="destructive"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Disable
              </Button>
              <Button
                onClick={() => testOperation('reset-enable')}
                disabled={loading}
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reset & Enable
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-red-700 text-sm overflow-auto">{error}</pre>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-green-700 text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 