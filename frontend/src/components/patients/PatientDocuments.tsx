import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, Trash2, Download, Eye, Loader2, File, Image, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface PatientDocumentsProps {
  patientId: string;
}

const DOCUMENT_CATEGORIES = [
  { value: 'lab_result', label: 'Lab Results' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'referral', label: 'Referral Letters' },
  { value: 'imaging', label: 'Imaging/X-Ray' },
  { value: 'insurance', label: 'Insurance Documents' },
  { value: 'consent', label: 'Consent Forms' },
  { value: 'other', label: 'Other' },
];

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-5 h-5 text-purple-500" />;
  if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PatientDocuments({ patientId }: PatientDocumentsProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['patientDocuments', patientId],
    queryFn: async () => {
      try {
        const response = await api.get(`/patients/${patientId}/documents`);
        return response.data.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('category', selectedCategory || 'other');
      const response = await api.post(`/patients/${patientId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });
      toast({ title: 'Success', description: 'Document uploaded successfully' });
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.response?.data?.message || 'Failed to upload document',
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await api.delete(`/patients/${patientId}/documents/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });
      toast({ title: 'Success', description: 'Document deleted' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        });
        return;
      }
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const handleDelete = (documentId: string, documentName: string) => {
    if (confirm(`Are you sure you want to delete "${documentName}"?`)) {
      deleteMutation.mutate(documentId);
    }
  };

  const documentList: Document[] = documents || [];

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Upload className="w-4 h-4 text-blue-500" />
          Upload Document
        </h3>
        
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category...</option>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </>
            )}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
            onChange={handleFileSelect}
          />
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Supported formats: PDF, Word, Excel, Images. Max size: 10MB
        </p>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Documents
            {documentList.length > 0 && (
              <span className="ml-auto text-sm font-normal text-gray-500">
                {documentList.length} file{documentList.length !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : documentList.length > 0 ? (
          <div className="divide-y">
            {documentList.map((doc: Document) => (
              <div key={doc.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getFileIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.url, '_blank')}
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = doc.url;
                      link.download = doc.name;
                      link.click();
                    }}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id, doc.name)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No documents uploaded yet</p>
            <p className="text-sm mt-1">Upload lab results, prescriptions, or other medical documents</p>
          </div>
        )}
      </div>
    </div>
  );
}
