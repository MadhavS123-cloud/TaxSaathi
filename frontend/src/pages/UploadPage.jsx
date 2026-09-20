import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Eye, FileImage } from 'lucide-react';
import UploadDropzone from '../components/upload/UploadDropzone';
import DataTable from '../components/ui/DataTable';
import StatusTag from '../components/ui/StatusTag';
import { api } from '../services/api';

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const getFileExtension = (filename) => {
  return filename.split('.').pop().toUpperCase();
};

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();

  const handleFilesSelected = (selectedFiles) => {
    selectedFiles.forEach(async (file) => {
      const fileId = Math.random().toString(36).substr(2, 9);
      const newFileObj = {
        id: fileId,
        name: file.name,
        size: formatSize(file.size),
        status: 'processing',
        confidence: null,
        uploadedAt: new Date().toLocaleTimeString(),
        fileUrl: URL.createObjectURL(file),
      };

      setFiles((prev) => [newFileObj, ...prev]);

      try {
        const res = await api.extractDocument(file);
        if (res && res.success) {
          setFiles((current) =>
            current.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: 'matched',
                    confidence: 98,
                    extractedData: res.data,
                  }
                : f
            )
          );
        } else {
          setFiles((current) =>
            current.map((f) =>
              f.id === fileId ? { ...f, status: 'exception', error: res?.error } : f
            )
          );
        }
      } catch (err) {
        setFiles((current) =>
          current.map((f) => (f.id === fileId ? { ...f, status: 'exception' } : f))
        );
      }
    });
  };

  const testEmptyState = () => setFiles([]);
  
  const simulateFailedUpload = () => {
    const failedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Corrupted_Invoice_Scan.pdf',
      size: '2.4 MB',
      status: 'exception',
      confidence: 0,
      uploadedAt: new Date().toLocaleTimeString(),
    };
    setFiles((prev) => [failedFile, ...prev]);
  };

  const COLUMNS = [
    {
      header: 'Type',
      cell: (row) => {
        const ext = getFileExtension(row.name);
        return (
          <div className="w-8 h-8 flex items-center justify-center border border-hairline bg-paper/50 text-ink-muted">
            {ext === 'PDF' ? <FileText size={14} strokeWidth={1.5} /> : <FileImage size={14} strokeWidth={1.5} />}
          </div>
        );
      }
    },
    {
      header: 'Filename',
      cell: (row) => {
        const ext = getFileExtension(row.name);
        const nameWithoutExt = row.name.substring(0, row.name.lastIndexOf('.'));
        return (
          <div className="flex items-center gap-2">
            <span className="font-sans font-medium text-ink truncate max-w-[200px]">{nameWithoutExt}</span>
            <span className="border border-hairline px-1.5 py-0.5 text-[9px] font-mono text-ink-muted uppercase tracking-widest bg-paper-raised">
              {ext}
            </span>
          </div>
        );
      }
    },
    {
      header: 'File Size',
      accessor: 'size',
      type: 'mono'
    },
    {
      header: 'Status',
      cell: (row) => {
        // Map internal status to display labels
        let label = 'Processing';
        if (row.status === 'matched') label = 'Extracted';
        if (row.status === 'exception') label = 'Failed';
        if (row.status === 'pending') label = 'Pending';
        
        return <StatusTag status={row.status} label={label} />;
      }
    },
    {
      header: 'Processing State',
      cell: (row) => (
        <span className="text-xs font-mono text-ink-muted">
          {row.status === 'matched' ? `${row.confidence}% Avg Confidence` : row.status === 'exception' ? 'Extraction Failed' : 'Scanning...'}
        </span>
      )
    },
    {
      header: 'Action',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button className="text-ink-muted hover:text-ink transition-colors p-1" title="Inspect Source">
            <Eye size={16} strokeWidth={1.5} />
          </button>
          <button 
            className="text-xs font-sans font-medium text-paper bg-ink hover:text-brass px-3 py-1.5 rounded-[2px] transition-colors disabled:opacity-50"
            disabled={row.status !== 'matched'}
            onClick={() => navigate(`/app/cases/CAS-2024-001/invoices/${row.id}/review`, { state: { extractedData: row.extractedData, filename: row.name, fileUrl: row.fileUrl } })}
          >
            Review
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-[1000px] mx-auto flex flex-col gap-8 pb-12">
      
      {/* 1. Header Card */}
      <div className="bg-paper-raised border border-hairline p-6 flex items-start justify-between">
        <div className="flex gap-4">
          <div className="w-10 h-10 border border-hairline flex items-center justify-center bg-paper text-ink-muted shrink-0">
            <UploadCloud size={20} strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-[0.15em] uppercase text-ink-muted mb-1">
              Document Upload & Optical Character Recognition
            </div>
            <p className="text-sm font-sans text-ink leading-relaxed max-w-xl">
              Ingest bulk invoices, receipts, and bank statements for this case. The OCR engine will automatically classify documents and extract structured line items.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 ml-4">
          <button 
            onClick={testEmptyState}
            className="text-[11px] font-sans text-ink-muted border border-hairline px-3 py-1.5 rounded-[2px] hover:bg-paper transition-colors"
          >
            Test Empty State
          </button>
          <button 
            onClick={simulateFailedUpload}
            className="text-[11px] font-sans text-ink-muted border border-hairline px-3 py-1.5 rounded-[2px] hover:bg-paper transition-colors"
          >
            Simulate Failed Upload
          </button>
        </div>
      </div>

      {/* 2. Dropzone */}
      <UploadDropzone onFilesSelected={handleFilesSelected} />

      {/* 3. Uploaded File Queue */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-hairline pb-2">
          <h3 className="font-serif text-lg text-ink">Uploaded File Queue ({files.length})</h3>
        </div>
        
        <div className="bg-paper-raised border border-hairline">
          <DataTable columns={COLUMNS} data={files} />
        </div>
      </div>

    </div>
  );
}
