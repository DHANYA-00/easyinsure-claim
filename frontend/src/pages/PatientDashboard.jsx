import { useCallback, useEffect, useState } from 'react';
import SubmitClaim from '../components/SubmitClaim';
import Pagination from '../components/Pagination';
import { apiRequest } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 10;

function PatientDashboard({ user, onLogout }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [selectedClaimFiles, setSelectedClaimFiles] = useState(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadClaims = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const data = await apiRequest('/claims/my');
      setClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load your claims.');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleClaimSubmitted(newClaim) {
    if (newClaim) {
      setClaims((previousClaims) => [
        newClaim,
        ...previousClaims.filter((claim) => claim._id !== newClaim._id),
      ]);
    }

    setSuccess('Claim submitted successfully.');
    setShowClaimForm(false);
    setCurrentPage(1);
  }

  function formatDate(date) {
    if (!date) {
      return '—';
    }

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatCurrency(amount) {
    if (amount === undefined || amount === null || amount === '') {
      return '—';
    }

    return `₹${Number(amount).toLocaleString('en-IN')}`;
  }

  function getFileNameWithoutExtension(filename) {
    if (!filename) {
      return 'Document';
    }
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return filename;
    }
    return filename.substring(0, lastDotIndex);
  }

  function getDocumentItems(claim) {
    if (Array.isArray(claim?.documents) && claim.documents.length > 0) {
      return claim.documents;
    }

    if (claim?.document) {
      return [
        {
          filename: claim.document,
          originalName: claim.documentOriginalName || claim.documentName || 'Uploaded document',
          mimeType: claim.documentMimeType || 'application/octet-stream',
          size: claim.documentSize || 0,
        },
      ];
    }

    return [];
  }

  async function viewDocument(claimId, documentIndex = 0) {
    try {
      const endpoint = documentIndex > 0 ? `/claims/${claimId}/documents/${documentIndex}` : `/claims/${claimId}/document`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Unable to access document.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      window.open(url, '_blank', 'noopener,noreferrer');

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (err) {
      setError(err.message || 'Failed to open document.');
    }
  }

  function openClaimDetails(claim) {
    setSelectedClaim(claim);
  }

  function closeClaimDetails() {
    setSelectedClaim(null);
  }

  function openFileViewer(claim) {
    setSelectedClaimFiles(claim);
  }

  function closeFileViewer() {
    setSelectedClaimFiles(null);
  }

  function openClaimForm() {
    setError('');
    setSuccess('');
    setShowClaimForm(true);
  }

  function closeClaimForm() {
    setShowClaimForm(false);
  }

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccess('');
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    let isActive = true;

    async function initializeClaims() {
      try {
        const data = await apiRequest('/claims/my');

        if (!isActive) {
          return;
        }

        setClaims(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isActive) {
          return;
        }

        setError(err.message || 'Failed to load your claims.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    initializeClaims();

    return () => {
      isActive = false;
    };
  }, [loadClaims]);

  const pending = claims.filter((claim) => claim.status === 'PENDING').length;
  const approved = claims.filter((claim) => claim.status === 'APPROVED').length;
  const rejected = claims.filter((claim) => claim.status === 'REJECTED').length;
  const totalPages = Math.max(1, Math.ceil(claims.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const visibleClaims = claims.slice(startIndex, startIndex + PAGE_SIZE);
  const paginationSummary = claims.length
    ? `Showing ${startIndex + 1}-${startIndex + visibleClaims.length} of ${claims.length} claims`
    : '';

  const documentItems = getDocumentItems(selectedClaim);
  const fileViewerItems = getDocumentItems(selectedClaimFiles);

  return (
    <div className="patient-dashboard">
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-icon">
            <img className="brand-image" src="/icons.png" alt="EasyInsure logo" />
          </div>

          <div>
            <h1>EasyInsure</h1>
            <p>Patient Portal</p>
          </div>
        </div>

        <div className="header-user">
          <div className="header-user-info">
            <span className="header-user-email">{user?.email}</span>
            <span className="header-user-role">Patient</span>
          </div>

          <button className="secondary-button" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <h2>Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!</h2>
          <p>Track your claims, submit new requests, and review every decision in one place.</p>
        </section>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Total Claims</span>
              <div className="stat-icon">#</div>
            </div>
            <strong>{claims.length}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span>Pending</span>
              <div className="stat-icon">⏳</div>
            </div>
            <strong>{pending}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span>Approved</span>
              <div className="stat-icon">✓</div>
            </div>
            <strong>{approved}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span>Rejected</span>
              <div className="stat-icon">!</div>
            </div>
            <strong>{rejected}</strong>
          </div>
        </div>

        <section className="claims-section">
          <div className="section-header">
            <div>
              <h2>My Claims</h2>
              <p>Review your claim history and open any supporting document.</p>
            </div>

            <div className="section-actions">
              <button className="primary-button" type="button" onClick={openClaimForm}>
                + Add New Claim
              </button>
              <button className="secondary-button" type="button" onClick={loadClaims} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && !showClaimForm && <div className="success-message">{success}</div>}

          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">↻</div>
              <h3>Loading your claims</h3>
              <p>Please wait while we retrieve the latest information.</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">+</div>
              <h3>No claims yet</h3>
              <p>You have not submitted any insurance claims yet.</p>
              <button className="primary-button" type="button" onClick={openClaimForm}>
                Add Your First Claim
              </button>
            </div>
          ) : (
            <div className="claims-table-shell">
              <div className="claims-table-wrapper">
                <table className="claims-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Name</th>
                      <th style={{ width: '15%' }}>Amount</th>
                      <th style={{ width: '15%' }}>Submitted</th>
                      <th style={{ width: '15%' }}>Approved Amount</th>
                      <th style={{ width: '12%' }}>Status</th>
                      <th style={{ width: '8%' }}>Files</th>
                      <th style={{ width: '10%' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleClaims.map((claim) => (
                      <tr key={claim._id}>
                        <td>
                          <span className="claim-patient-name">{claim.name}</span>
                        </td>
                        <td>{formatCurrency(claim.claimAmount)}</td>
                        <td>{formatDate(claim.submissionDate)}</td>
                        <td>{claim.status === 'APPROVED' ? formatCurrency(claim.approvedAmount) : '—'}</td>
                        <td>
                          <span className={`status status-${String(claim.status).toLowerCase()}`}>{claim.status}</span>
                        </td>
                        <td>
                          {getDocumentItems(claim).length > 0 ? (
                            <button className="link-button" type="button" onClick={() => openFileViewer(claim)}>
                              View
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <button className="secondary-button small-button" type="button" onClick={() => openClaimDetails(claim)}>
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} summary={paginationSummary} />
            </div>
          )}
        </section>
      </main>

      {selectedClaim && (
        <div className="modal-overlay" onClick={closeClaimDetails}>
          <div className="modal-card claim-details-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Claim Details</h2>
                <p>Review the submitted details for this claim.</p>
              </div>
              <button type="button" className="close-button" onClick={closeClaimDetails}>
                ×
              </button>
            </div>

            <hr className="modal-divider" />

            <div className="modal-body-scroll">
              <div className="claim-details-grid">
                <div className="claim-detail-item">
                  <span className="claim-detail-label">Claimant</span>
                  <span className="claim-detail-value">{selectedClaim.name}</span>
                </div>
                <div className="claim-detail-item">
                  <span className="claim-detail-label">Email</span>
                  <span className="claim-detail-value text-wrap-anywhere">{selectedClaim.email}</span>
                </div>
                 <div className="claim-detail-item">
                  <span className="claim-detail-label">Claim Amount</span>
                  <span className="claim-detail-value">{formatCurrency(selectedClaim.claimAmount)}</span>
                </div>
                <div className="claim-detail-item">
                  <span className="claim-detail-label">Approved Amount</span>
                  <span className="claim-detail-value">{selectedClaim.status === 'APPROVED' ? formatCurrency(selectedClaim.approvedAmount) : '—'}</span>
                </div>
                <div className="claim-detail-item">
                  <span className="claim-detail-label">Status</span>
                  <span className="claim-detail-value">
                    <span className={`status status-${String(selectedClaim.status).toLowerCase()}`}>{selectedClaim.status}</span>
                  </span>
                </div>
                <div className="claim-detail-item">
                  <span className="claim-detail-label">Submitted</span>
                  <span className="claim-detail-value">{formatDate(selectedClaim.submissionDate)}</span>
                </div>
                <div className="claim-detail-item">
                  <span className="claim-detail-label">Documents</span>
                  <span className="claim-detail-value">
                    {documentItems.length > 0 ? (
                      <div className="detail-documents-row">
                        <span>Files attached</span>
                        <button className="link-button detail-link-button" type="button" onClick={() => openFileViewer(selectedClaim)}>
                          View files
                        </button>
                      </div>
                    ) : (
                      'No supporting documents attached.'
                    )}
                  </span>
                </div>
                <div className="claim-detail-item claim-detail-full">
                  <span className="claim-detail-label">Description</span>
                  <span className="claim-detail-value text-wrap-anywhere">{selectedClaim.description || 'No description provided.'}</span>
                </div>
                {selectedClaim.insurerComments && (
                  <div className="claim-detail-item claim-detail-full">
                    <span className="claim-detail-label">Insurer Notes</span>
                    <span className="claim-detail-value text-wrap-anywhere">{selectedClaim.insurerComments}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedClaimFiles && (
        <div className="modal-overlay" onClick={closeFileViewer}>
          <div className="modal-card files-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Attached Files</h2>
                <p>View only the claim documents uploaded by the patient.</p>
              </div>
              <button type="button" className="close-button" onClick={closeFileViewer}>
                ×
              </button>
            </div>

            <hr className="modal-divider" />

            <div className="modal-body-scroll">
              <div className="document-list modal-document-list">
                {fileViewerItems.length > 0 ? (
                  fileViewerItems.map((document, index) => (
                    <button
                      key={`${document.filename || document.originalName}-${index}`}
                      className="secondary-button small-button"
                      type="button"
                      onClick={() => viewDocument(selectedClaimFiles._id, index)}
                    >
                      {getFileNameWithoutExtension(document.originalName)}
                    </button>
                  ))
                ) : (
                  <p className="claim-detail-value">No supporting documents available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showClaimForm && (
        <div className="modal-overlay" onClick={closeClaimForm}>
          <div className="modal-card modal-card-wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Create New Claim</h2>
                <p>Add a new claim with the supporting document.</p>
              </div>
              <button type="button" className="close-button" onClick={closeClaimForm}>
                ×
              </button>
            </div>

            <SubmitClaim user={user} onSubmitted={handleClaimSubmitted} onClose={closeClaimForm} />
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;
