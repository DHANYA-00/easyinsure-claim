import { useRef, useState } from 'react';
import { apiRequest } from '../services/api';

function SubmitClaim({ user, onSubmitted, onClose }) {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    claimAmount: '',
    description: '',
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  const maxFiles = 50;

  function handleFileChange(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      setSelectedFiles([]);
      return;
    }

    if (files.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} files at once.`);
      setSelectedFiles([]);
      event.target.value = '';
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    const invalidFile = files.find((file) => !allowedTypes.includes(file.type));

    if (invalidFile) {
      setError('Only PDF, JPEG and PNG files are allowed.');
      setSelectedFiles([]);
      event.target.value = '';
      return;
    }

    const oversizedFile = files.find((file) => file.size > 5 * 1024 * 1024);

    if (oversizedFile) {
      setError('Each document must be smaller than 5 MB.');
      setSelectedFiles([]);
      event.target.value = '';
      return;
    }

    setError('');
    setSelectedFiles(files);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function removeSelectedFile(index) {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setMessage('');

    if (!form.name.trim()) {
      setError('Please enter the patient name.');
      setLoading(false);
      return;
    }

    if (!form.email.trim()) {
      setError('Please enter the email address.');
      setLoading(false);
      return;
    }

    if (!form.claimAmount) {
      setError('Please enter the claim amount.');
      setLoading(false);
      return;
    }

    if (Number(form.claimAmount) <= 0) {
      setError('Claim amount must be greater than zero.');
      setLoading(false);
      return;
    }

    if (!selectedFiles.length) {
      setError('Please upload at least one claim document.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('email', form.email.trim());
      formData.append('claimAmount', form.claimAmount);
      if (form.description.trim()) {
        formData.append('description', form.description.trim());
      }
      selectedFiles.forEach((file) => {
        formData.append('documents', file);
      });

      const createdClaim = await apiRequest('/claims', {
        method: 'POST',
        body: formData,
      });

      setMessage('Your claim has been submitted successfully.');
      setForm({
        name: '',
        email: '',
        claimAmount: '',
        description: '',
      });
      setSelectedFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onSubmitted) {
        await onSubmitted(createdClaim);
      }

      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit claim.');
    } finally {
      setLoading(false);
    }
  }

  const selectedFilesLabel = selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected` : 'No files selected';

  return (
    <section className="submit-claim-section">
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <form className="claim-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group animate-field" style={{ animationDelay: '0.05s' }}>
            <label htmlFor="claim-name">Patient Name</label>
            <input id="claim-name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Enter patient name" required disabled={loading} />
          </div>

          <div className="form-group animate-field" style={{ animationDelay: '0.1s' }}>
            <label htmlFor="claim-email">Email Address</label>
            <input id="claim-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="patient@example.com" required disabled={loading} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group animate-field" style={{ animationDelay: '0.15s' }}>
            <label htmlFor="claim-amount">Claim Amount</label>
            <input id="claim-amount" name="claimAmount" type="number" min="1" step="0.01" value={form.claimAmount} onChange={handleChange} placeholder="Enter claim amount" required disabled={loading} />
          </div>
        </div>

        <div className="form-group animate-field" style={{ animationDelay: '0.2s' }}>
          <label htmlFor="claim-description">Claim Description (Optional)</label>
          <textarea id="claim-description" name="description" rows="4" value={form.description} onChange={handleChange} placeholder="Describe the medical treatment or expense." disabled={loading} />
        </div>

        <div className="form-section-divider" />

        <div className="form-group file-upload-group animate-field" style={{ animationDelay: '0.25s' }}>
          <label>Upload Supporting Documents</label>
          <input ref={fileInputRef} id="claim-document" name="documents" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileChange} required disabled={loading} style={{ display: 'none' }} />

          <div 
            className="file-upload-dropzone" 
            onClick={openFilePicker}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('dragover');
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const filesArray = Array.from(e.dataTransfer.files);
                setSelectedFiles((prev) => {
                  const updated = [...prev, ...filesArray].slice(0, 50);
                  return updated;
                });
              }
            }}
          >
            <div className="dropzone-icon">📁</div>
            <div className="dropzone-text">
              <strong>Drag & drop supporting files</strong> or <span className="dropzone-link">browse your device</span>
            </div>
            <small className="dropzone-subtext">Supports PDF, JPG, PNG (Max 5MB each)</small>
          </div>

          {selectedFiles.length > 0 && (
            <ul className="file-chip-list">
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}-${file.size}`} className="document-pill animate-chip">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="remove-file-button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeSelectedFile(index)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedFiles.length > 0 && <small className="upload-success">Supporting documents are ready to upload.</small>}
        </div>

        <div className="modal-actions animate-field" style={{ animationDelay: '0.3s' }}>
          {onClose && (
            <button className="secondary-button" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          )}
          <button className="primary-button button-interactive" type="submit" disabled={loading}>
            {loading ? 'Submitting Claim...' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default SubmitClaim;
