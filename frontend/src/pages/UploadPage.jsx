import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UploadCloud, FileText, Eye, FileImage, AlertCircle } from 'lucide-react';
import UploadDropzone from '../components/upload/UploadDropzone';
import DataTable from '../components/ui/DataTable';
import StatusTag from '../components/ui/StatusTag';
import { api } from '../lib/api';

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const getFileExtension = (filename) => {
  return filename.split('.').pop().toUpperCase();
};

export default function UploadPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loadError, setLoadError] = useState(null);

  // Load existing documents for this case on mount
  useEffect(() => {
    if (!caseId) return;
    api.documents.list(caseId)
      .then((docs) => {
        const mapped = (docs || []).map((d) => ({
          id: d.id,
          name: d.filename,
          size: formatSize(d.file_size || 0),
          status: d.status === 'extracted' ? 'matched' : d.status === 'failed' ? 'exception' : 'processing',
          errorDetail: d.error_detail,
          confidence: d.status === 'extracted' ? 95 : null,
          uploadedAt: d.created_at,
          extractedData: d.extracted_json,
          dbId: d.id,
        }));
        setFiles(mapped);
      })
      .catch((e) => setLoadError(String(e)));
  }, [caseId]);

  if (!caseId) {
    return (
      <div className="max-w-[1000px] mx-auto flex flex-col gap-8 pb-12">
        <div className="bg-amber-50 border border-amber-200 rounded-[2px] p-6 flex items-center gap-4">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="font-sans font-medium text-amber-800">No case selected</p>
            <p className="text-sm text-amber-700 mt-1">
              Please open a case from the{' '}
              <button onClick={() => navigate('/app/dashboard')} className="underline">dashboard</button>
              {' '}before uploading documents.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleFilesSelected = (selectedFiles) => {
    selectedFiles.forEach(async (file) => {
      const tempId = Math.random().toString(36).substr(2, 9);
      const newFileObj = {
        id: tempId,
        name: file.name,
        size: formatSize(file.size),
        status: 'processing',
        confidence: null,
        uploadedAt: new Date().toLocaleTimeString(),
        fileUrl: URL.createObjectURL(file),
      };

      setFiles((prev) => [newFileObj, ...prev]);

      try {
        const res = await api.documents.upload(caseId, file);
        setFiles((current) =>
          current.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  id: res.id,
                  dbId: res.id,
                  status: res.status === 'extracted' ? 'matched' : res.status === 'failed' ? 'exception' : 'processing',
                  confidence: res.status === 'extracted' ? 95 : null,
                  extractedData: res.extracted_json,
                  errorDetail: res.error_detail,
                }
              : f
          )
        );
      } catch (err) {
        setFiles((current) =>
          current.map((f) =>
            f.id === tempId
              ? { ...f, status: 'exception', errorDetail: String(err.message || err) }
              : f
          )
        );
      }
    });
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
        <span
          className="text-xs font-mono text-ink-muted cursor-default"
          title={row.errorDetail || ''}
        >
          {row.status === 'matched'
            ? `${row.confidence || 95}% Avg Confidence`
            : row.status === 'exception'
            ? row.errorDetail
              ? `Error: ${row.errorDetail.slice(0, 60)}${row.errorDetail.length > 60 ? '…' : ''}`
              : 'Extraction Failed'
            : 'Scanning...'}
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
            onClick={() =>
              navigate(`/app/cases/${caseId}/invoices/${row.dbId || row.id}/review`, {
                state: { extractedData: row.extractedData, filename: row.name, fileUrl: row.fileUrl, caseId }
              })
            }
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
              Document Upload &amp; Optical Character Recognition
            </div>
            <p className="text-sm font-sans text-ink leading-relaxed max-w-xl">
              Ingest bulk invoices, receipts, and bank statements for this case. The OCR engine will automatically classify documents and extract structured line items.
            </p>
            <p className="text-xs font-mono text-brass mt-1">Case: {caseId}</p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="p-4 bg-rust/10 border border-rust/30 text-rust rounded-[2px] text-sm font-sans">
          Failed to load existing documents: {loadError}
        </div>
      )}

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
