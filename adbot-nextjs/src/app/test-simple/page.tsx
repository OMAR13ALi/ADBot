'use client';

import { useState } from 'react';
import { apiService } from '@/lib/api';

export default function TestSimplePage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const testConnection = async () => {
    setStatus('loading');
    setMessage('');
    setError('');

    try {
      const response = await apiService.testConnection();
      
      if (response.error) {
        setStatus('error');
        setError(response.error);
      } else {
        setStatus('success');
        setMessage(response.data?.message || 'Connection successful');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Simple API Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Connection</h2>
          
          <button
            onClick={testConnection}
            disabled={status === 'loading'}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
          >
            {status === 'loading' ? 'Testing...' : 'Test API Connection'}
          </button>

          {status === 'success' && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
              <p className="text-green-800">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-medium mb-2">Connection Details:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Backend URL: http://127.0.0.1:8000</li>
              <li>• Frontend URL: http://localhost:3000</li>
              <li>• API Proxy: /api/* → http://127.0.0.1:8000/*</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 