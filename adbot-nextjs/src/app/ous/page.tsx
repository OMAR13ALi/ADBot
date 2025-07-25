'use client';

import { useState, useEffect } from 'react';
import { OrganizationalUnit } from '@/lib/types';
import { ousService } from '@/lib/services/ous';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { OUForm } from '@/components/ous/ou-form';
import { OUDetails } from '@/components/ous/ou-details';

export default function OUsPage() {
  const [ous, setOUs] = useState<OrganizationalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showOUDetails, setShowOUDetails] = useState(false);
  const [selectedOU, setSelectedOU] = useState<OrganizationalUnit | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOUs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await ousService.getOUs();
      
      if (response.error) {
        setError(response.error);
      } else {
        setOUs(response.data?.ous || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load OUs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOUs();
  }, []);

  const handleSearch = () => {
    // For now, we'll do client-side filtering
    // In the future, we can add server-side search
    loadOUs();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    loadOUs();
  };

  const handleCreateOU = () => {
    setShowCreateForm(true);
  };

  const handleViewOU = (ou: OrganizationalUnit) => {
    setSelectedOU(ou);
    setShowOUDetails(true);
  };

  const handleEditOU = (ou: OrganizationalUnit) => {
    setSelectedOU(ou);
    setShowEditForm(true);
  };

  const handleDeleteOU = async (ou: OrganizationalUnit) => {
    if (!confirm(`Are you sure you want to delete OU "${ou.Name}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await ousService.deleteOU(ou.DistinguishedName);
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        loadOUs(); // Refresh the list
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete OU');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadOUs(); // Refresh the list after successful operation
  };

  const getParentPath = (distinguishedName?: string) => {
    if (!distinguishedName) return 'Unknown';
    const parts = distinguishedName.split(',');
    if (parts.length > 1) {
      parts.shift(); // Remove the first part (current OU)
      return parts.join(', ');
    }
    return 'Root';
  };

  // Filter OUs based on search term
  const filteredOUs = ous.filter(ou =>
    ou.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ou.Description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Organizational Units</h1>
              <p className="text-gray-600 mt-2">
                Manage Active Directory organizational units
              </p>
            </div>
            <Button onClick={handleCreateOU} disabled={actionLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Add OU
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Search and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search OUs</CardTitle>
            <CardDescription>
              Search for organizational units by name or description
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search OUs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800 text-sm">
                <strong>Error:</strong> {error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* OUs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Organizational Units ({filteredOUs.length})</CardTitle>
            <CardDescription>
              Active Directory organizational units in your domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading OUs...</span>
              </div>
            ) : filteredOUs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No organizational units found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOUs.map((ou) => (
                    <TableRow key={ou.DistinguishedName}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          {ou.Name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ou.Description || "No description"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getParentPath(ou.DistinguishedName)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewOU(ou)}
                            disabled={actionLoading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditOU(ou)}
                            disabled={actionLoading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteOU(ou)}
                            disabled={actionLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {showCreateForm && (
        <OUForm
          mode="create"
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showEditForm && selectedOU && (
        <OUForm
          ou={selectedOU}
          mode="edit"
          onClose={() => {
            setShowEditForm(false);
            setSelectedOU(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showOUDetails && selectedOU && (
        <OUDetails
          ou={selectedOU}
          onClose={() => {
            setShowOUDetails(false);
            setSelectedOU(null);
          }}
          onEdit={() => {
            setShowOUDetails(false);
            setShowEditForm(true);
          }}
          onDelete={() => {
            setShowOUDetails(false);
            setSelectedOU(null);
            handleDeleteOU(selectedOU);
          }}
        />
      )}
    </MainLayout>
  );
} 