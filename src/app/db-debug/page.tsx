'use client';

import { useState } from 'react';

interface DebugResult {
  operation: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp: string;
}

export default function DatabaseDebugPage() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [customParams, setCustomParams] = useState('');

  const executeOperation = async (operation: string, query?: string, params?: any[]) => {
    setLoading(operation);
    
    try {
      const response = await fetch('/api/db-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          query,
          params,
        }),
      });

      const result: DebugResult = await response.json();
      setResults(prev => [result, ...prev]);
    } catch (error) {
      const errorResult: DebugResult = {
        operation,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
      setResults(prev => [errorResult, ...prev]);
    } finally {
      setLoading(null);
    }
  };

  const executeCustomQuery = () => {
    let params: any[] = [];
    if (customParams.trim()) {
      try {
        params = JSON.parse(customParams);
      } catch (error) {
        alert('Invalid JSON in parameters field');
        return;
      }
    }
    executeOperation('custom_query', customQuery, params);
  };

  const clearResults = () => {
    setResults([]);
  };

  const formatData = (data: any) => {
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (success: boolean) => {
    return success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Debug Console</h1>
          <p className="text-gray-600 mb-6">
            Test database connections, queries, and operations to diagnose authentication and connection issues.
          </p>

          {/* Quick Test Operations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">Connection Tests</h3>
              <button
                onClick={() => executeOperation('connection_test')}
                disabled={loading === 'connection_test'}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading === 'connection_test' ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={() => executeOperation('pool_status')}
                disabled={loading === 'pool_status'}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading === 'pool_status' ? 'Checking...' : 'Pool Status'}
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">Basic Queries</h3>
              <button
                onClick={() => executeOperation('simple_query')}
                disabled={loading === 'simple_query'}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading === 'simple_query' ? 'Running...' : 'Simple Query'}
              </button>
              <button
                onClick={() => executeOperation('users_count')}
                disabled={loading === 'users_count'}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading === 'users_count' ? 'Counting...' : 'Count Users'}
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">User Operations</h3>
              <button
                onClick={() => executeOperation('users_select')}
                disabled={loading === 'users_select'}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading === 'users_select' ? 'Selecting...' : 'Select Users'}
              </button>
              <button
                onClick={() => executeOperation('check_recent_users')}
                disabled={loading === 'check_recent_users'}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading === 'check_recent_users' ? 'Checking...' : 'Recent Users'}
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">Advanced Tests</h3>
              <button
                onClick={() => executeOperation('transaction_test')}
                disabled={loading === 'transaction_test'}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                {loading === 'transaction_test' ? 'Testing...' : 'Transaction Test'}
              </button>
              <button
                onClick={() => executeOperation('auth_flow_simulation')}
                disabled={loading === 'auth_flow_simulation'}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                {loading === 'auth_flow_simulation' ? 'Simulating...' : 'Auth Flow Test'}
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">Table Info</h3>
              <button
                onClick={() => executeOperation('check_user_table')}
                disabled={loading === 'check_user_table'}
                className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
              >
                {loading === 'check_user_table' ? 'Checking...' : 'User Table Schema'}
              </button>
              <button
                onClick={() => executeOperation('users_insert_test')}
                disabled={loading === 'users_insert_test'}
                className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
              >
                {loading === 'users_insert_test' ? 'Inserting...' : 'Insert Test User'}
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">Maintenance</h3>
              <button
                onClick={() => executeOperation('users_update_test')}
                disabled={loading === 'users_update_test'}
                className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
              >
                {loading === 'users_update_test' ? 'Updating...' : 'Update Test'}
              </button>
              <button
                onClick={() => executeOperation('cleanup_debug_users')}
                disabled={loading === 'cleanup_debug_users'}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {loading === 'cleanup_debug_users' ? 'Cleaning...' : 'Cleanup Debug Users'}
              </button>
            </div>
          </div>

          {/* Custom Query Section */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-800 mb-4">Custom Query</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SQL Query
                </label>
                <textarea
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="SELECT * FROM users LIMIT 5;"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parameters (JSON array, optional)
                </label>
                <input
                  type="text"
                  value={customParams}
                  onChange={(e) => setCustomParams(e.target.value)}
                  placeholder='["param1", "param2"]'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={executeCustomQuery}
                  disabled={!customQuery.trim() || loading === 'custom_query'}
                  className="px-6 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
                >
                  {loading === 'custom_query' ? 'Executing...' : 'Execute Query'}
                </button>
                <button
                  onClick={clearResults}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Clear Results
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Results ({results.length})
          </h2>
          
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No operations executed yet. Click a button above to test database operations.
            </p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getStatusBg(result.success)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {result.operation}
                      </span>
                      <span className={`font-medium ${getStatusColor(result.success)}`}>
                        {result.success ? '✓ SUCCESS' : '✗ FAILED'}
                      </span>
                      {result.duration && (
                        <span className="text-sm text-gray-500">
                          ({result.duration}ms)
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {result.error && (
                    <div className="mb-2">
                      <strong className="text-red-700">Error:</strong>
                      <pre className="mt-1 text-sm text-red-600 bg-red-100 p-2 rounded overflow-x-auto">
                        {result.error}
                      </pre>
                    </div>
                  )}

                  {result.data && (
                    <div>
                      <strong className="text-gray-700">Data:</strong>
                      <pre className="mt-1 text-sm text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
                        {formatData(result.data)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}