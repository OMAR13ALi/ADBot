'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { computersService } from '@/lib/services/computers';
import { Computer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, RefreshCw, Monitor, Eye } from 'lucide-react';
import { ComputerDetails } from '@/components/computers/computer-details';

export default function ComputersPage() {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showComputerDetails, setShowComputerDetails] = useState(false);
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null);

  const loadComputers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await computersService.getComputers({
        search: searchTerm || undefined,
        limit: 100
      });
      
      if (response.error) {
        setError(response.error);
      } else {
        setComputers(response.data?.computers || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load computers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComputers();
  }, []);

  const handleSearch = () => {
    loadComputers();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    loadComputers();
  };

  const handleViewComputer = (computer: Computer) => {
    setSelectedComputer(computer);
    setShowComputerDetails(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === 'Never') return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getParentPath = (distinguishedName?: string) => {
    if (!distinguishedName) return 'Unknown';
    const parts = distinguishedName.split(',');
    if (parts.length > 1) {
      parts.shift(); // Remove the first part (current computer)
      return parts.join(', ');
    }
    return 'Root';
  };

  // Filter computers based on search term
  const filteredComputers = computers.filter(computer =>
    computer.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    computer.SamAccountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (computer.Description && computer.Description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (computer.OperatingSystem && computer.OperatingSystem.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Computer Management</h1>
              <p className="text-gray-600 mt-2">
                View and manage Active Directory computers in your domain
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Search and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Computers</CardTitle>
            <CardDescription>
              Search for computers by name, SAM account name, description, or operating system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search computers..."
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

        {/* Computers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Computers ({filteredComputers.length})</CardTitle>
            <CardDescription>
              Active Directory computers in your domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading computers...</span>
              </div>
            ) : filteredComputers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No computers found</p>
                <p className="text-sm">Try adjusting your search criteria or refresh the list</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Computer Name</TableHead>
                    <TableHead>SAM Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Operating System</TableHead>
                    <TableHead>Last Logon</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComputers.map((computer) => (
                    <TableRow key={computer.SamAccountName}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-blue-600" />
                          {computer.Name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {computer.SamAccountName}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={computer.Enabled ? "default" : "secondary"}>
                          {computer.Enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {computer.OperatingSystem || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {formatDate(computer.LastLogonDate)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {getParentPath(computer.DistinguishedName)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {computer.Description || "No description"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewComputer(computer)}
                            title="View Computer Details"
                          >
                            <Eye className="h-4 w-4" />
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

      {/* Computer Details Modal */}
      {showComputerDetails && selectedComputer && (
        <ComputerDetails
          computer={selectedComputer}
          onClose={() => {
            setShowComputerDetails(false);
            setSelectedComputer(null);
          }}
        />
      )}
    </MainLayout>
  );
} 