import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import PrimaryButton from '../ui/PrimaryButton';

export default function UploadDropzone({ onFilesSelected }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`w-full min-h-[300px] border border-dashed flex flex-col items-center justify-center p-10 transition-colors ${
          isDragActive 
            ? 'border-brass bg-brass/5' 
            : 'border-hairline bg-paper'
        }`}
      >
        <div className="w-12 h-12 border border-hairline bg-paper-raised flex items-center justify-center mb-6">
          <Upload size={24} className="text-ink-muted" strokeWidth={1.5} />
        </div>
        
        <h3 className="text-xl font-serif text-ink mb-2">Drag & Drop Tax Invoices or Receipts Here</h3>
        <p className="text-sm font-sans text-ink-muted mb-8 text-center max-w-md">
          Upload digitized documents for automatic data extraction and ledger reconciliation. 
          The OCR engine will process standard formats.
        </p>
        
        <PrimaryButton onClick={handleBrowseClick}>+ Browse Files</PrimaryButton>
        <input 
          type="file" 
          multiple 
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </div>
      
      <div className="mt-3 text-[11px] font-mono text-ink-muted tracking-wide uppercase">
        PDF, JPG, PNG — max 10MB
      </div>
    </div>
  );
}
