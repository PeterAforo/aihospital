import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import api from '../../services/api';

export default function LabReport() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderId) loadReport();
  }, [orderId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/lab/orders/${orderId}/report`, {
        responseType: 'text',
        headers: { Accept: 'text/html' },
      });
      setHtml(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-report-${orderId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading lab report...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-4 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center text-red-500 py-12">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 no-print">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <iframe
          srcDoc={html}
          title="Lab Report"
          className="w-full border-0"
          style={{ minHeight: '800px' }}
        />
      </div>
    </div>
  );
}
